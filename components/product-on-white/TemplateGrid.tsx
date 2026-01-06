'use client';

import { useState } from 'react';
import { upload } from '@vercel/blob/client';
import styles from './TemplateGrid.module.css';
import { ImageType, PromptPreset } from '@/types';

interface TemplateGridProps {
    templates: ImageType[];
    promptModifications: Record<string, string>;
    onPromptModification: (templateId: string, modification: string) => void;
    onTemplatesChange: (templates: ImageType[], saveNow?: boolean) => void;
    presets?: PromptPreset[];
    onAddPreset?: (name: string, promptText: string) => void;
    onDeletePreset?: (presetId: string) => void;
}

export default function TemplateGrid({
    templates,
    promptModifications,
    onPromptModification,
    onTemplatesChange,
    presets,
    onAddPreset,
    onDeletePreset
}: TemplateGridProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
        templates[0]?.id || null
    );
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditingBasePrompt, setIsEditingBasePrompt] = useState(false);
    const [editedBasePrompt, setEditedBasePrompt] = useState('');

    // New template form state
    const [newTemplateImage, setNewTemplateImage] = useState<File | null>(null);
    const [newTemplateImagePreview, setNewTemplateImagePreview] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);

    const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

    const handleAddTemplate = (newTemplate: Omit<ImageType, 'id' | 'createdAt' | 'updatedAt'>) => {
        const template: ImageType = {
            ...newTemplate,
            id: `custom-${Date.now()}`,
            isActive: true, // Default to active
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        onTemplatesChange([...templates, template]);
        setShowAddModal(false);
        // Reset form state
        setNewTemplateImage(null);
        setNewTemplateImagePreview('');
    };

    const handleNewTemplateImageChange = (file: File) => {
        setNewTemplateImage(file);
        // Create preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
            setNewTemplateImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleCloseModal = () => {
        if (isUploading) return; // Prevent closing while uploading
        setShowAddModal(false);
        setNewTemplateImage(null);
        setNewTemplateImagePreview('');
        setIsUploading(false);
    };

    const handleStartEditBasePrompt = () => {
        if (selectedTemplateData) {
            setEditedBasePrompt(selectedTemplateData.basePrompt);
            setIsEditingBasePrompt(true);
        }
    };

    const handleSaveBasePrompt = () => {
        if (selectedTemplateData && editedBasePrompt.trim()) {
            const updatedTemplates = templates.map(t =>
                t.id === selectedTemplateData.id
                    ? { ...t, basePrompt: editedBasePrompt.trim(), updatedAt: new Date() }
                    : t
            );
            onTemplatesChange(updatedTemplates);
            setIsEditingBasePrompt(false);
        }
    };

    const handleCancelEditBasePrompt = () => {
        setIsEditingBasePrompt(false);
        setEditedBasePrompt('');
    };

    const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selecting the template

        // Find the template to get the URL
        const templateToDelete = templates.find(t => t.id === templateId);

        if (!confirm('Are you sure you want to delete this template?')) return;

        // Optimistically update the UI
        const updatedTemplates = templates.filter(t => t.id !== templateId);
        onTemplatesChange(updatedTemplates, true); // saveNow=true for immediate persistence
        if (selectedTemplate === templateId) {
            setSelectedTemplate(updatedTemplates[0]?.id || null);
        }

        // Fire and forget the blob deletion to avoid UI lag
        if (templateToDelete && templateToDelete.templateImageUrl) {
            try {
                // Call our new API route to delete the blob
                await fetch(`/api/templates/blob?url=${encodeURIComponent(templateToDelete.templateImageUrl)}`, {
                    method: 'DELETE'
                });
                console.log('Blob deleted successfully for template:', templateId);
            } catch (err) {
                console.error('Failed to delete blob for template:', templateId, err);
                // We don't revert the UI change because the metadata removal is more important to the user
            }
        }
    };

    const handleToggleActive = (e: React.MouseEvent, templateId: string) => {
        e.stopPropagation();
        const updatedTemplates = templates.map(t =>
            t.id === templateId ? { ...t, isActive: !t.isActive, updatedAt: new Date() } : t
        );
        onTemplatesChange(updatedTemplates, true);
    };

    // --- Image Swapping Logic ---
    const [isSwapping, setIsSwapping] = useState(false);

    // Hidden file input ref for swapping
    const swapInputRef = (input: HTMLInputElement | null) => {
        if (input) {
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file || !selectedTemplateData) return;

                if (!confirm(`Replace image for "${selectedTemplateData.name}"?`)) {
                    (e.target as HTMLInputElement).value = ''; // Reset
                    return;
                }

                setIsSwapping(true);
                try {
                    // 1. Upload new image
                    const blob = await upload(file.name, file, {
                        access: 'public',
                        handleUploadUrl: '/api/upload',
                    });

                    // 2. Delete old image (cleanup)
                    if (selectedTemplateData.templateImageUrl) {
                        await fetch(`/api/templates/blob?url=${encodeURIComponent(selectedTemplateData.templateImageUrl)}`, {
                            method: 'DELETE'
                        });
                    }

                    // 3. Update template with new URL
                    const updatedTemplates = templates.map(t =>
                        t.id === selectedTemplateData.id
                            ? { ...t, templateImageUrl: blob.url, updatedAt: new Date() }
                            : t
                    );
                    onTemplatesChange(updatedTemplates, true); // Save immediately

                    alert('Image updated successfully!');

                } catch (err) {
                    console.error('Failed to swap image:', err);
                    alert('Failed to update image.');
                } finally {
                    setIsSwapping(false);
                    (e.target as HTMLInputElement).value = ''; // Reset input
                }
            };
        }
    }

    // --- Drag and Drop Logic ---
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            handleNewTemplateImageChange(file);
        }
    };

    const handleDownloadTemplate = async () => {
        if (!selectedTemplateData || !selectedTemplateData.templateImageUrl) return;

        try {
            const response = await fetch(selectedTemplateData.templateImageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            // Extract extension or default to png
            const ext = blob.type.split('/')[1] || 'png';
            link.download = `${selectedTemplateData.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${ext}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download image:', error);
            alert('Failed to download image');
        }
    };

    return (
        <div className={styles.container}>
            {/* Template Thumbnails */}
            <div className={styles.thumbnailGrid}>
                {templates.map((template) => (
                    <div
                        key={template.id}
                        className={`${styles.thumbnail} ${selectedTemplate === template.id ? styles.selected : ''} ${!template.isActive ? styles.inactive : ''}`}
                        onClick={() => setSelectedTemplate(template.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setSelectedTemplate(template.id)}
                    >
                        <div className={styles.thumbnailImage}>
                            {template.templateImageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={template.templateImageUrl}
                                    alt={template.name}
                                    className={styles.thumbnailImg}
                                />
                            ) : (
                                <div className={styles.imagePlaceholder}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                        <circle cx="9" cy="9" r="2" />
                                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <span className={styles.thumbnailName}>{template.name}</span>
                        {promptModifications[template.id] && (
                            <span className={styles.modifiedBadge}>Modified</span>
                        )}
                        <button
                            className={styles.deleteTemplateButton}
                            onClick={(e) => handleDeleteTemplate(template.id, e)}
                            title="Delete template"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18" />
                                <path d="m6 6 12 12" />
                            </svg>
                        </button>
                        <button
                            className={`${styles.toggleButton} ${template.isActive ? styles.active : ''}`}
                            onClick={(e) => handleToggleActive(e, template.id)}
                            title={template.isActive ? "Pause generation" : "Resume generation"}
                        >
                            {template.isActive ? 'Active' : 'Paused'}
                        </button>
                    </div>
                ))}

                {/* Add New Button */}
                <button
                    className={styles.addButton}
                    onClick={() => setShowAddModal(true)}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                    </svg>
                    <span>Add New</span>
                </button>
            </div>

            {/* Selected Template Details */}
            {selectedTemplateData && (
                <div className={styles.details}>
                    <div className={styles.detailsHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <h4 className={styles.detailsTitle}>
                                {selectedTemplateData.name}
                            </h4>
                            <div className={styles.swapImageContainer}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    id={`swap-image-${selectedTemplateData.id}`}
                                    style={{ display: 'none' }}
                                    ref={swapInputRef}
                                    disabled={isSwapping}
                                />
                                <label
                                    htmlFor={`swap-image-${selectedTemplateData.id}`}
                                    className={styles.editButton}
                                    style={{ cursor: isSwapping ? 'wait' : 'pointer', fontSize: '0.8rem' }}
                                >
                                    {isSwapping ? 'Uploading...' : 'Replace Image'}
                                </label>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className={styles.editButton}
                                    title="Download original template image"
                                >
                                    Download Image
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={styles.promptSection}>
                        <div className={styles.promptHeader}>
                            <label className={styles.promptLabel}>Base Prompt</label>
                            {!isEditingBasePrompt && (
                                <button
                                    className={styles.editButton}
                                    onClick={handleStartEditBasePrompt}
                                    type="button"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                    </svg>
                                    Edit
                                </button>
                            )}
                        </div>
                        {isEditingBasePrompt ? (
                            <div className={styles.editPromptContainer}>
                                <textarea
                                    value={editedBasePrompt}
                                    onChange={(e) => setEditedBasePrompt(e.target.value)}
                                    className={styles.editPromptInput}
                                    rows={4}
                                    autoFocus
                                />
                                <div className={styles.editPromptActions}>
                                    <button
                                        type="button"
                                        onClick={handleCancelEditBasePrompt}
                                        className={styles.cancelEditButton}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveBasePrompt}
                                        className={styles.saveEditButton}
                                        disabled={!editedBasePrompt.trim()}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className={styles.basePrompt}>{selectedTemplateData.basePrompt}</p>
                        )}
                    </div>

                    <div className={styles.modificationSection}>
                        <label htmlFor="modification" className={styles.promptLabel}>
                            Add Modification
                        </label>
                        <textarea
                            id="modification"
                            value={promptModifications[selectedTemplateData.id] || ''}
                            onChange={(e) =>
                                onPromptModification(selectedTemplateData.id, e.target.value)
                            }
                            placeholder="e.g., Make the drawstring black instead of white"
                            className={styles.modificationInput}
                            rows={2}
                        />

                        <div className={styles.presetSection}>
                            <div className={styles.presetHeader}>
                                <span className={styles.presetLabel}>Quick presets:</span>
                                {(promptModifications[selectedTemplateData.id] || '').trim() && (
                                    <button
                                        className={styles.savePresetButton}
                                        onClick={() => {
                                            const text = promptModifications[selectedTemplateData.id];
                                            const name = prompt('Preset Name:', text.slice(0, 20) + (text.length > 20 ? '...' : ''));
                                            if (name) {
                                                onAddPreset?.(name, text);
                                            }
                                        }}
                                        title="Save current text as a new preset"
                                    >
                                        + Save as Preset
                                    </button>
                                )}
                            </div>

                            <div className={styles.presetList}>
                                {presets && presets.length > 0 ? (
                                    presets.map(preset => (
                                        <div key={preset.id} className={styles.presetItem}>
                                            <button
                                                className={styles.presetButton}
                                                onClick={() => onPromptModification(selectedTemplateData.id, preset.promptText)}
                                                title={preset.promptText}
                                            >
                                                {preset.name}
                                            </button>
                                            <button
                                                className={styles.deletePresetButton}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Delete preset "${preset.name}"?`)) {
                                                        onDeletePreset?.(preset.id);
                                                    }
                                                }}
                                                title="Delete preset"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <span style={{ color: '#999', fontSize: '0.85rem' }}>No presets yet. Type a modification and click "Save as Preset".</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Template Modal */}
            {showAddModal && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Add New Template</h3>
                        <p className={styles.modalDescription}>
                            Upload a new template image and provide a generation prompt.
                        </p>
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!newTemplateImage) return;

                                const form = e.currentTarget; // Capture form reference before async await

                                setIsUploading(true);
                                try {
                                    // Upload to Vercel Blob
                                    const blob = await upload(newTemplateImage.name, newTemplateImage, {
                                        access: 'public',
                                        handleUploadUrl: '/api/upload',
                                    });

                                    const formData = new FormData(form);
                                    handleAddTemplate({
                                        name: formData.get('name') as string,
                                        templateImageUrl: blob.url,
                                        // Do NOT set base64 to avoid payload limits
                                        templateImageBase64: undefined,
                                        basePrompt: formData.get('prompt') as string,
                                        sortOrder: templates.length,
                                        isActive: true, // Default to true
                                    });
                                } catch (err) {
                                    console.error('Upload failed:', err);
                                    alert('Failed to upload image. Please try again.');
                                } finally {
                                    setIsUploading(false);
                                }
                            }}
                        >
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Template Name</label>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    placeholder="e.g., Angled View"
                                    className={styles.formInput}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Upload Image</label>
                                <div
                                    className={`${styles.uploadArea} ${isDragging ? styles.dragOver : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    style={{ borderColor: isDragging ? 'var(--primary-color)' : '', backgroundColor: isDragging ? 'var(--cream-main)' : '' }}
                                >
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleNewTemplateImageChange(file);
                                        }}
                                        className={styles.fileInput}
                                        id="template-image-upload"
                                    />
                                    <label htmlFor="template-image-upload" className={styles.uploadPlaceholder}>
                                        {newTemplateImagePreview ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={newTemplateImagePreview}
                                                alt="Preview"
                                                className={styles.uploadPreview}
                                            />
                                        ) : (
                                            <>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                    <polyline points="17 8 12 3 7 8" />
                                                    <line x1="12" y1="3" x2="12" y2="15" />
                                                </svg>
                                                <span>Click or Drag to upload template image</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                                {newTemplateImage && (
                                    <p className={styles.fileName}>{newTemplateImage.name}</p>
                                )}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Generation Prompt</label>
                                <textarea
                                    name="prompt"
                                    required
                                    placeholder="Describe how the AI should apply the pattern..."
                                    className={styles.formTextarea}
                                    rows={3}
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className={styles.cancelButton}
                                    disabled={isUploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.submitButton}
                                    disabled={isUploading || !newTemplateImage}
                                >
                                    {isUploading ? 'Uploading...' : 'Add Template'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
