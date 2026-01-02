'use client';

import React, { useState } from 'react';
import styles from './TemplateGrid.module.css';
import { ImageType } from '@/types';

interface TemplateGridProps {
    templates: ImageType[];
    promptModifications: Record<string, string>;
    onPromptModification: (templateId: string, modification: string) => void;
    onTemplatesChange: (templates: ImageType[]) => void;
}

export default function TemplateGrid({
    templates,
    promptModifications,
    onPromptModification,
    onTemplatesChange,
}: TemplateGridProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
        templates[0]?.id || null
    );
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditingBasePrompt, setIsEditingBasePrompt] = useState(false);
    const [editedBasePrompt, setEditedBasePrompt] = useState('');

    const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

    const handleAddTemplate = (newTemplate: Omit<ImageType, 'id' | 'createdAt' | 'updatedAt'>) => {
        const template: ImageType = {
            ...newTemplate,
            id: `custom-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        onTemplatesChange([...templates, template]);
        setShowAddModal(false);
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

    return (
        <div className={styles.container}>
            {/* Template Thumbnails */}
            <div className={styles.thumbnailGrid}>
                {templates.map((template) => (
                    <button
                        key={template.id}
                        className={`${styles.thumbnail} ${selectedTemplate === template.id ? styles.selected : ''
                            }`}
                        onClick={() => setSelectedTemplate(template.id)}
                    >
                        <div className={styles.thumbnailImage}>
                            {/* Placeholder for template image */}
                            <div className={styles.imagePlaceholder}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                    <circle cx="9" cy="9" r="2" />
                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                </svg>
                            </div>
                        </div>
                        <span className={styles.thumbnailName}>{template.name}</span>
                        {promptModifications[template.id] && (
                            <span className={styles.modifiedBadge}>Modified</span>
                        )}
                    </button>
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
                        <h4 className={styles.detailsTitle}>
                            {selectedTemplateData.name}
                        </h4>
                        <button className={styles.swapButton}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                                <path d="M16 16h5v5" />
                            </svg>
                            Swap Template
                        </button>
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
                        <div className={styles.presetRow}>
                            <span className={styles.presetLabel}>Quick presets:</span>
                            <button
                                className={styles.presetButton}
                                onClick={() =>
                                    onPromptModification(
                                        selectedTemplateData.id,
                                        'Make the drawstring black instead of white'
                                    )
                                }
                            >
                                Black drawstring
                            </button>
                            <button
                                className={styles.presetButton}
                                onClick={() =>
                                    onPromptModification(
                                        selectedTemplateData.id,
                                        'Make the image slightly brighter and more vibrant'
                                    )
                                }
                            >
                                Brighter colors
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Template Modal - simplified version */}
            {showAddModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Add New Template</h3>
                        <p className={styles.modalDescription}>
                            Upload a new template image and provide a generation prompt.
                        </p>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                handleAddTemplate({
                                    productTypeId: 'lifeguard-hat',
                                    name: formData.get('name') as string,
                                    templateImageUrl: '/templates/custom.jpg',
                                    basePrompt: formData.get('prompt') as string,
                                    sortOrder: templates.length,
                                });
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
                                <div className={styles.uploadPlaceholder}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    <span>Click to upload template image</span>
                                </div>
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
                                >
                                    Cancel
                                </button>
                                <button type="submit" className={styles.submitButton}>
                                    Add Template
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
