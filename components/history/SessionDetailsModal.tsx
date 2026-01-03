'use client';

import React, { useEffect } from 'react';
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

    if (!isOpen || !session) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.titleGroup}>
                        <h3 className={styles.title}>Session Details</h3>
                        <span className={styles.date}>
                            {session.createdAt.toLocaleDateString()} at {session.createdAt.toLocaleTimeString()}
                        </span>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>

                <div className={styles.content}>
                    <div className={styles.metadataGrid}>
                        <div className={styles.metadataItem}>
                            <h4>Pattern</h4>
                            <div className={styles.metadataValue}>
                                {session.patternImageUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={session.patternImageUrl}
                                        alt="Pattern"
                                        className={styles.patternThumb}
                                    />
                                )}
                                <span>{session.patternName || 'Unknown Pattern'}</span>
                            </div>
                        </div>

                        <div className={styles.metadataItem}>
                            <h4>Product Type</h4>
                            <div className={styles.metadataValue}>
                                {session.productTypeId}
                            </div>
                        </div>

                        <div className={styles.metadataItem}>
                            <h4>Output Settings</h4>
                            <div className={styles.metadataValue}>
                                {session.outputSettings.width}x{session.outputSettings.height} • {session.outputSettings.format.toUpperCase()}
                            </div>
                        </div>
                    </div>

                    <div className={styles.imageGrid}>
                        {session.images.map((img) => (
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
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
