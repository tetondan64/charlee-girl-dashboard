'use client';

import React from 'react';
import styles from './UsageBar.module.css';

interface UsageBarProps {
    apiCalls: number;
    estimatedCost: number;
}

export default function UsageBar({ apiCalls, estimatedCost }: UsageBarProps) {
    return (
        <div className={styles.usageBar}>
            <div className={styles.container}>
                <div className={styles.stat}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20V10" />
                        <path d="M18 20V4" />
                        <path d="M6 20v-4" />
                    </svg>
                    <span className={styles.label}>This Month:</span>
                    <span className={styles.value}>{apiCalls} generations</span>
                </div>
                <div className={styles.divider}></div>
                <div className={styles.stat}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                    </svg>
                    <span className={styles.label}>Est. Cost:</span>
                    <span className={styles.value}>${estimatedCost.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}
