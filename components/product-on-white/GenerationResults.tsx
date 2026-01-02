'use client';

import React, { useState } from 'react';
import styles from './GenerationResults.module.css';
import { GeneratedImage, ImageType } from '@/types';

interface GenerationResultsProps {
    images: GeneratedImage[];
    templates: ImageType[];
    patternName: string;
    onRegenerate: (imageId: string, refinementPrompt: string) => void;
    onBack: () => void;
}

export default function GenerationResults({
    images,
    templates,
    patternName,
    onRegenerate,
    onBack,
}: GenerationResultsProps) {
    const [refinementPrompts, setRefinementPrompts] = useState<Record<string, string>>({});
    const [downloadingAll, setDownloadingAll] = useState(false);

    const getTemplateName = (imageTypeId: string) => {
        return templates.find(t => t.id === imageTypeId)?.name || 'Unknown';
    };

    const formatFileName = (index: number) => {
        const safeName = patternName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        return `${safeName}-hat-${String(index + 1).padStart(2, '0')}.jpg`;
    };

    const handleDownloadAll = async () => {
        setDownloadingAll(true);
        // Simulate download delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setDownloadingAll(false);
        // In real implementation, would trigger a zip download
        alert('Download All functionality will be connected to actual image files');
    };

    const completedImages = images.filter(img => img.status === 'completed');
    const totalCost = images.reduce((sum, img) => sum + img.apiCost, 0);

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <button onClick={onBack} className={styles.backButton}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m12 19-7-7 7-7" />
                        <path d="M19 12H5" />
                    </svg>
                    Back to Setup
                </button>
                <div className={styles.headerInfo}>
                    <h2 className={styles.title}>Generation Results</h2>
                    <p className={styles.subtitle}>
                        Pattern: {patternName} • {completedImages.length} of {images.length} complete
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <span className={styles.cost}>Est. Cost: ${totalCost.toFixed(2)}</span>
                    <button
                        onClick={handleDownloadAll}
                        className={styles.downloadAllButton}
                        disabled={downloadingAll || completedImages.length === 0}
                    >
                        {downloadingAll ? (
                            <>
                                <span className={styles.spinner}></span>
                                Preparing...
                            </>
                        ) : (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Download All ({completedImages.length})
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Naming Preview */}
            <div className={styles.namingPreview}>
                <span className={styles.namingLabel}>File naming:</span>
                <code className={styles.namingExample}>
                    {formatFileName(0)}, {formatFileName(1)}, ...
                </code>
            </div>

            {/* Results Grid */}
            <div className={styles.resultsGrid}>
                {images.map((image, index) => (
                    <div key={image.id} className={styles.resultCard}>
                        <div className={styles.comparison}>
                            {/* Template Side */}
                            <div className={styles.comparisonSide}>
                                <span className={styles.sideLabel}>Template</span>
                                <div className={styles.imageContainer}>
                                    <div className={styles.imagePlaceholder}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                            <circle cx="9" cy="9" r="2" />
                                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                        </svg>
                                        <span>Original</span>
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className={styles.divider}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                </svg>
                            </div>

                            {/* Generated Side */}
                            <div className={styles.comparisonSide}>
                                <span className={styles.sideLabel}>Generated</span>
                                <div className={styles.imageContainer}>
                                    {image.status === 'pending' || image.status === 'generating' ? (
                                        <div className={styles.generating}>
                                            <div className={styles.generatingSpinner}></div>
                                            <span>Generating...</span>
                                        </div>
                                    ) : image.status === 'failed' ? (
                                        <div className={styles.failed}>
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="m15 9-6 6" />
                                                <path d="m9 9 6 6" />
                                            </svg>
                                            <span>Failed</span>
                                        </div>
                                    ) : (
                                        <div className={styles.imagePlaceholder}>
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                                            </svg>
                                            <span>Generated</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Card Footer */}
                        <div className={styles.cardFooter}>
                            <div className={styles.cardInfo}>
                                <span className={styles.imageName}>{getTemplateName(image.imageTypeId)}</span>
                                {image.status === 'completed' && (
                                    <span className={styles.statusBadge}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 6 9 17l-5-5" />
                                        </svg>
                                        Complete
                                    </span>
                                )}
                            </div>

                            {image.status === 'completed' && (
                                <>
                                    <div className={styles.refinementRow}>
                                        <input
                                            type="text"
                                            value={refinementPrompts[image.id] || ''}
                                            onChange={(e) =>
                                                setRefinementPrompts(prev => ({
                                                    ...prev,
                                                    [image.id]: e.target.value,
                                                }))
                                            }
                                            placeholder="Refine: e.g., Make brighter..."
                                            className={styles.refinementInput}
                                        />
                                        <button
                                            onClick={() => {
                                                if (refinementPrompts[image.id]) {
                                                    onRegenerate(image.id, refinementPrompts[image.id]);
                                                    setRefinementPrompts(prev => ({
                                                        ...prev,
                                                        [image.id]: '',
                                                    }));
                                                }
                                            }}
                                            disabled={!refinementPrompts[image.id]}
                                            className={styles.regenerateButton}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                                <path d="M3 3v5h5" />
                                                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                                                <path d="M16 16h5v5" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className={styles.cardActions}>
                                        <span className={styles.fileName}>{formatFileName(index)}</span>
                                        <button className={styles.downloadButton}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="7 10 12 15 17 10" />
                                                <line x1="12" y1="15" x2="12" y2="3" />
                                            </svg>
                                            Download
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
