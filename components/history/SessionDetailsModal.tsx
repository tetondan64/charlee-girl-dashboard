'use client';

import React, { useState, useEffect } from 'react';
import styles from './SessionDetailsModal.module.css';
import { GeneratedImage, GenerationSession } from '@/types';

interface HistoryItem extends GenerationSession {
    images: GeneratedImage[];
}

interface SessionDetailsModalProps {
    session: HistoryItem | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function SessionDetailsModal({
    session,
    isOpen,
    onClose
}: SessionDetailsModalProps) {
    const [localSession, setLocalSession] = useState<HistoryItem | null>(session);

    useEffect(() => {
        setLocalSession(session);
    }, [session]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    const handleDeleteImage = async (imageId: string) => {
        if (!localSession) return;
        if (!confirm('Are you sure you want to delete this image? This cannot be undone.')) return;

        // Optimistic update
        const previousImages = localSession.images;
        setLocalSession(prev => prev ? {
            ...prev,
            images: prev.images.filter(img => img.id !== imageId)
        } : null);

        try {
            const res = await fetch(`/api/history?id=${localSession.id}&type=image&imageId=${imageId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete');
        } catch (error) {
            console.error(error);
            alert('Failed to delete image');
            // Revert
            setLocalSession(prev => prev ? { ...prev, images: previousImages } : null);
        }
    };

    if (!isOpen || !localSession) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.titleGroup}>
                        <h3 className={styles.title}>Session Details</h3>
                        <span className={styles.date}>
                            {localSession.createdAt.toLocaleDateString()} at {localSession.createdAt.toLocaleTimeString()}
                        </span>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>

                <div className={styles.content}>
                    <div className={styles.metadataGrid}>
                        <div className={styles.metadataItem}>
                            <h4>Pattern</h4>
                            <div className={styles.metadataValue}>
                                {localSession.patternImageUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={localSession.patternImageUrl}
                                        alt="Pattern"
                                        className={styles.patternThumb}
                                    />
                                )}
                                <span>{localSession.patternName || 'Unknown Pattern'}</span>
                            </div>
                        </div>

                        <div className={styles.metadataItem}>
                            <h4>Product Type</h4>
                            <div className={styles.metadataValue}>
                                {localSession.productTypeId}
                            </div>
                        </div>

                        <div className={styles.metadataItem}>
                            <h4>Output Settings</h4>
                            <div className={styles.metadataValue}>
                                {localSession.outputSettings?.width ? `${localSession.outputSettings.width}x${localSession.outputSettings.height} • ` : ''}
                                {localSession.outputSettings?.format ? localSession.outputSettings.format.toUpperCase() : (localSession.outputSettings?.size || 'Unknown')}
                            </div>
                        </div>
                    </div>

                    <div className={styles.imageGrid}>
                        {localSession.images.map((img) => (
                            <div key={img.id} className={styles.imageCard}>
                                <div className={styles.imageWrapper}>
                                    {img.generatedImageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={img.generatedImageUrl} alt="Generated result" />
                                    ) : (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                                            {img.status.replace('_', ' ')}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.imageInfo}>
                                    <p className={styles.prompt} title={img.promptModification || img.promptUsed}>
                                        {img.promptModification || 'No prompt modification'}
                                    </p>
                                    <div className={styles.cardFooter}>
                                        <button
                                            className={styles.deleteImageBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteImage(img.id);
                                            }}
                                            title="Delete Image"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M3 6h18" />
                                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                            </svg>
                                        </button>
                                        {img.generatedImageUrl && (
                                            <a
                                                href={img.generatedImageUrl}
                                                download
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.downloadLink}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Download High-Res
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
