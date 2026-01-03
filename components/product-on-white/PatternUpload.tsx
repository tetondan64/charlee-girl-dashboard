'use client';

import React, { useCallback, useState, useEffect } from 'react';
import styles from './PatternUpload.module.css';
import { upload } from '@vercel/blob/client';

interface PersistentPattern {
    id: string;
    name: string;
    url: string;
}

interface PatternUploadProps {
    onUpload: (fileOrUrl: File | string) => void;
    patternName: string;
    onPatternNameChange: (name: string) => void;
    currentFile: File | string | null;
}

export default function PatternUpload({
    onUpload,
    patternName,
    onPatternNameChange,
    currentFile
}: PatternUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [activeTab, setActiveTab] = useState<'upload' | 'saved'>('upload');
    const [savedPatterns, setSavedPatterns] = useState<PersistentPattern[]>([]);
    const [isLoadingPatterns, setIsLoadingPatterns] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Fetch saved patterns
    const fetchPatterns = useCallback(async () => {
        setIsLoadingPatterns(true);
        try {
            const res = await fetch('/api/patterns');
            if (res.ok) {
                const data = await res.json();
                setSavedPatterns(data);
            }
        } catch (error) {
            console.error('Failed to load patterns', error);
        } finally {
            setIsLoadingPatterns(false);
        }
    }, []);

    useEffect(() => {
        // Always fetch patterns on mount
        fetchPatterns();
    }, [fetchPatterns]);

    useEffect(() => {
        if (activeTab !== 'saved') {
            setIsSelectionMode(false);
            setSelectedIds(new Set());
        }
    }, [activeTab]);

    const handleFile = useCallback(async (file: File) => {
        if (file.type.startsWith('image/')) {
            // Check for duplicate name
            const derivedName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            // Ensure we have the latest list if possible, but state is best we have
            const existing = savedPatterns.find(p => p.name.toLowerCase() === derivedName.toLowerCase());

            if (existing) {
                // If user confirms, use the existing pattern instead of re-uploading
                if (confirm(`Pattern "${derivedName}" already exists in your saved patterns.\n\nClick OK to use the existing pattern.\nClick Cancel to upload as a new copy.`)) {
                    onUpload(existing.url);
                    onPatternNameChange(existing.name);
                    return;
                }
            }

            // 1. Set as current immediately for preview
            onUpload(file);

            // 2. Upload to Blob for persistence
            setIsUploading(true);
            try {
                const newBlob = await upload(file.name, file, {
                    access: 'public',
                    handleUploadUrl: '/api/upload',
                });

                // 3. Save to Redis
                const newPattern: PersistentPattern = {
                    id: `pat-${Date.now()}`,
                    // If duplicate, append timestamp to name to avoid exact name collision in DB if strictly enforced (it's not, but good practice)
                    name: existing ? `${derivedName} ${new Date().toLocaleTimeString()}` : derivedName,
                    url: newBlob.url,
                };

                await fetch('/api/patterns', {
                    method: 'POST',
                    body: JSON.stringify(newPattern),
                });

                // Refresh list
                fetchPatterns();

            } catch (err) {
                console.error('Failed to save pattern persistence:', err);
            } finally {
                setIsUploading(false);
            }
        }
    }, [onUpload, fetchPatterns, savedPatterns]);

    const handleSwatchSelect = (pattern: PersistentPattern) => {
        if (isSelectionMode) {
            const newSelected = new Set(selectedIds);
            if (newSelected.has(pattern.id)) {
                newSelected.delete(pattern.id);
            } else {
                newSelected.add(pattern.id);
            }
            setSelectedIds(newSelected);
        } else {
            onUpload(pattern.url);
            onPatternNameChange(pattern.name);
        }
    };

    const handleDeletePattern = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Delete this saved pattern?')) return;

        try {
            await fetch(`/api/patterns?id=${id}`, { method: 'DELETE' });
            fetchPatterns();
        } catch (err) {
            console.error('Failed to delete pattern:', err);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Delete ${selectedIds.size} saved patterns?`)) return;

        try {
            // Delete sequentially to avoid overwhelming server/rate limits (or parallel if safe)
            // Parallel is probably fine for < 50 items
            await Promise.all(Array.from(selectedIds).map(id =>
                fetch(`/api/patterns?id=${id}`, { method: 'DELETE' })
            ));

            setSelectedIds(new Set());
            setIsSelectionMode(false);
            fetchPatterns();
        } catch (err) {
            console.error('Failed to delete patterns:', err);
            alert('Some patterns failed to delete');
            fetchPatterns();
        }
    };

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedIds(new Set());
    };

    const handleRemoveCurrent = useCallback(() => {
        onUpload(null as unknown as File); // Clear
        onPatternNameChange('');
    }, [onUpload, onPatternNameChange]);

    // Helpers for preview
    const getPreviewUrl = () => {
        if (!currentFile) return null;
        if (typeof currentFile === 'string') return currentFile;
        return URL.createObjectURL(currentFile);
    };

    const previewUrl = getPreviewUrl();

    return (
        <div className={styles.container}>
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'upload' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('upload')}
                >
                    Upload New
                </button>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                        className={`${styles.tab} ${activeTab === 'saved' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('saved')}
                    >
                        Saved Swatches
                    </button>
                    {activeTab === 'saved' && savedPatterns.length > 0 && (
                        <button
                            className={styles.selectionToggle}
                            onClick={toggleSelectionMode}
                            title={isSelectionMode ? "Cancel selection" : "Select multiple to delete"}
                        >
                            {isSelectionMode ? 'Cancel' : 'Select'}
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'upload' && (
                <div className={styles.tabContent}>
                    {/* ... (upload content remains same) ... */}
                    {!currentFile ? (
                        <div
                            className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
                            }}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                        >
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) handleFile(e.target.files[0]);
                                }}
                                className={styles.fileInput}
                                id="pattern-upload"
                            />
                            <label htmlFor="pattern-upload" className={styles.dropzoneContent}>
                                <div className={styles.uploadIcon}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                </div>
                                <p className={styles.dropzoneText}>
                                    <span className={styles.dropzoneLink}>Click to upload</span> or drag and drop
                                </p>
                            </label>
                            {isUploading && <div className={styles.uploadingOverlay}>Saving...</div>}
                        </div>
                    ) : (
                        <div className={styles.preview}>
                            <div className={styles.previewImage}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={previewUrl || ''} alt="Pattern preview" />
                            </div>
                            <div className={styles.previewInfo}>
                                <p className={styles.fileName}>
                                    {typeof currentFile === 'string' ? 'Saved Pattern' : currentFile.name}
                                </p>
                                <button
                                    type="button"
                                    onClick={handleRemoveCurrent}
                                    className={styles.removeButton}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'saved' && (
                <div className={styles.savedContainer}>
                    {isSelectionMode && (
                        <div className={styles.selectionBar}>
                            <span>{selectedIds.size} selected</span>
                            {selectedIds.size > 0 && (
                                <button
                                    className={styles.bulkDeleteButton}
                                    onClick={handleBulkDelete}
                                >
                                    Delete Selected
                                </button>
                            )}
                        </div>
                    )}
                    <div className={styles.swatchGrid}>
                        {isLoadingPatterns ? (
                            <div className={styles.loading}>Loading patterns...</div>
                        ) : savedPatterns.length === 0 ? (
                            <div className={styles.emptyState}>No saved patterns yet. Upload one!</div>
                        ) : (
                            savedPatterns.map(pattern => (
                                <div
                                    key={pattern.id}
                                    className={`
                                        ${styles.swatchWrapper} 
                                        ${!isSelectionMode && currentFile === pattern.url ? styles.selectedSwatch : ''}
                                        ${isSelectionMode && selectedIds.has(pattern.id) ? styles.selectedForDeletion : ''}
                                        ${isSelectionMode ? styles.selectionMode : ''}
                                    `}
                                    onClick={() => handleSwatchSelect(pattern)}
                                >
                                    <div className={styles.swatchImage}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={pattern.url} alt={pattern.name} />
                                        {isSelectionMode && (
                                            <div className={styles.checkbox}>
                                                {selectedIds.has(pattern.id) && (
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.swatchLabel}>{pattern.name}</div>
                                    {!isSelectionMode && (
                                        <button
                                            className={styles.deleteSwatch}
                                            onClick={(e) => handleDeletePattern(e, pattern.id)}
                                            title="Delete pattern"
                                        >
                                            ×
                                        </button>
                                    )}
                                    {/* Zoom Popup (CSS Only) */}
                                    {!isSelectionMode && (
                                        <div className={styles.zoomPopup}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={pattern.url} alt={pattern.name} />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <div className={styles.nameInput}>
                <label htmlFor="patternName" className={styles.nameLabel}>
                    Pattern Name (used for file naming)
                </label>
                <input
                    id="patternName"
                    type="text"
                    value={patternName}
                    onChange={(e) => onPatternNameChange(e.target.value)}
                    placeholder="e.g., Tropical Hibiscus"
                    className={styles.input}
                />
            </div>
        </div>
    );
}
