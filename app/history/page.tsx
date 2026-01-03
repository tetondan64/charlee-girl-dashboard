'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import styles from './page.module.css';
import { GeneratedImage, GenerationSession } from '@/types';

interface HistoryItem extends GenerationSession {
    images: GeneratedImage[];
}

export default function HistoryPage() {
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/history');
            if (res.ok) {
                const data = await res.json();
                // Map dates back to Date objects
                const formatted = data.map((item: any) => ({
                    ...item,
                    createdAt: new Date(item.createdAt),
                    images: item.images || []
                }));
                setHistoryItems(formatted);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this session?')) return;

        try {
            const res = await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setHistoryItems(prev => prev.filter(item => item.id !== id));
            }
        } catch (error) {
            console.error('Failed to delete session:', error);
        }
    };

    return (
        <div className={styles.page}>
            <Header showBackButton backHref="/" title="Generation History" />
            <main className={styles.main}>
                <div className={styles.container}>
                    <h1 className={styles.title}>Past Generations</h1>
                    {isLoading ? (
                        <div className={styles.loading}>Loading history...</div>
                    ) : (
                        <div className={styles.grid}>
                            {historyItems.length === 0 ? (
                                <p className={styles.empty}>No generation history found.</p>
                            ) : (
                                historyItems.map(item => (
                                    <div key={item.id} className={styles.card}>
                                        <div className={styles.cardHeader}>
                                            <span className={styles.date}>{item.createdAt.toLocaleDateString()} {item.createdAt.toLocaleTimeString()}</span>
                                            <span className={`${styles.status} ${styles[item.status]}`}>
                                                {item.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className={styles.cardBody}>
                                            <div className={styles.thumbnailPlaceholder}>
                                                {item.images[0]?.generatedImageUrl ? (
                                                    <img src={item.images[0].generatedImageUrl} alt="Preview" />
                                                ) : (
                                                    <span>{item.patternName}</span> // Fallback to pattern name? Or icon
                                                )}
                                            </div>
                                            <div className={styles.info}>
                                                <h3>{item.productTypeId}</h3> {/* Ideally map ID to name */}
                                                <p>{item.images.length} image{item.images.length !== 1 ? 's' : ''}</p>
                                                <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '4px' }}>
                                                    Pattern: {item.patternName}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={styles.cardFooter}>
                                            <button className={styles.viewButton}>View Details</button>
                                            <button
                                                className={styles.deleteButton}
                                                title="Delete Session"
                                                onClick={() => handleDelete(item.id)}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 6h18" />
                                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
