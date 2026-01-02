'use client';

import React from 'react';
import Link from 'next/link';
import styles from './ToolCard.module.css';

interface ToolCardProps {
    id: string;
    name: string;
    description?: string;
    icon: string;
    href: string;
    enabled?: boolean;
    onEdit?: () => void;
}

export default function ToolCard({
    name,
    description,
    icon,
    href,
    enabled = true,
    onEdit
}: ToolCardProps) {
    const CardContent = () => (
        <>
            <div className={styles.iconWrapper}>
                <span className={styles.icon}>{icon}</span>
            </div>
            <div className={styles.content}>
                <h3 className={styles.name}>{name}</h3>
                {description && <p className={styles.description}>{description}</p>}
            </div>
            {!enabled && (
                <span className={styles.comingSoon}>Coming Soon</span>
            )}
            {onEdit && (
                <button
                    className={styles.editButton}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEdit();
                    }}
                    aria-label="Edit card"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                </button>
            )}
        </>
    );

    if (!enabled) {
        return (
            <div className={`${styles.card} ${styles.disabled}`}>
                <CardContent />
            </div>
        );
    }

    return (
        <Link href={href} className={styles.card}>
            <CardContent />
        </Link>
    );
}
