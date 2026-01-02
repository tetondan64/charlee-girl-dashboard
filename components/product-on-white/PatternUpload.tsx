'use client';

import React, { useCallback, useState } from 'react';
import styles from './PatternUpload.module.css';

interface PatternUploadProps {
    onUpload: (file: File) => void;
    patternName: string;
    onPatternNameChange: (name: string) => void;
    currentFile: File | null;
}

export default function PatternUpload({
    onUpload,
    patternName,
    onPatternNameChange,
    currentFile
}: PatternUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFile = useCallback((file: File) => {
        if (file.type.startsWith('image/')) {
            onUpload(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    }, [onUpload]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    }, [handleFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    }, [handleFile]);

    const handleRemove = useCallback(() => {
        setPreviewUrl(null);
        onUpload(null as unknown as File);
    }, [onUpload]);

    return (
        <div className={styles.container}>
            <label className={styles.label}>Pattern Image</label>

            {!currentFile ? (
                <div
                    className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleInputChange}
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
                        <p className={styles.dropzoneHint}>
                            Upload an image of the hat under-brim pattern
                        </p>
                    </label>
                </div>
            ) : (
                <div className={styles.preview}>
                    <div className={styles.previewImage}>
                        {previewUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={previewUrl} alt="Pattern preview" />
                        )}
                    </div>
                    <div className={styles.previewInfo}>
                        <p className={styles.fileName}>{currentFile.name}</p>
                        <button
                            type="button"
                            onClick={handleRemove}
                            className={styles.removeButton}
                        >
                            Remove
                        </button>
                    </div>
                </div>
            )}

            <div className={styles.nameInput}>
                <label htmlFor="patternName" className={styles.nameLabel}>
                    Pattern Name (for file naming)
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
