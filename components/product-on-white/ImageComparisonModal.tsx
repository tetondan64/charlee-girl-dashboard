'use client';

import React, { useState, useEffect } from 'react';
import styles from './ImageComparisonModal.module.css';

interface ImageComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    templateImage: string;
    generatedImage: string;
    title: string;
}

export default function ImageComparisonModal({
    isOpen,
    onClose,
    templateImage,
    generatedImage,
    title
}: ImageComparisonModalProps) {
    const [activeView, setActiveView] = useState<'split' | 'template' | 'generated'>('split');
    const [zoomLevel, setZoomLevel] = useState(1);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setActiveView('split');
            setZoomLevel(1);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 3));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 1));

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h3 className={styles.title}>{title}</h3>
                    <div className={styles.controls}>
                        <div className={styles.viewToggles}>
                            <button
                                className={`${styles.toggleBtn} ${activeView === 'template' ? styles.active : ''}`}
                                onClick={() => setActiveView('template')}
                            >
                                Template
                            </button>
                            <button
                                className={`${styles.toggleBtn} ${activeView === 'split' ? styles.active : ''}`}
                                onClick={() => setActiveView('split')}
                            >
                                Split View
                            </button>
                            <button
                                className={`${styles.toggleBtn} ${activeView === 'generated' ? styles.active : ''}`}
                                onClick={() => setActiveView('generated')}
                            >
                                Generated
                            </button>
                        </div>
                        <div className={styles.zoomControls}>
                            <button onClick={handleZoomOut} disabled={zoomLevel <= 1}>-</button>
                            <span>{Math.round(zoomLevel * 100)}%</span>
                            <button onClick={handleZoomIn} disabled={zoomLevel >= 3}>+</button>
                        </div>
                        <button className={styles.closeBtn} onClick={onClose}>×</button>
                    </div>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    <div
                        className={`${styles.imageWrapper} ${styles[activeView]}`}
                        style={{ transform: `scale(${zoomLevel})` }}
                    >
                        {activeView !== 'generated' && (
                            <div className={styles.imageSide}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={templateImage} alt="Template" />
                                <span className={styles.label}>Template</span>
                            </div>
                        )}
                        {activeView !== 'template' && (
                            <div className={styles.imageSide}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={generatedImage} alt="Generated" />
                                <span className={styles.label}>Generated</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
