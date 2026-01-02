'use client';

import React from 'react';
import styles from './Header.module.css';
import Link from 'next/link';

interface HeaderProps {
    showBackButton?: boolean;
    backHref?: string;
    title?: string;
}

export default function Header({ showBackButton, backHref = '/', title }: HeaderProps) {
    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <div className={styles.left}>
                    {showBackButton && (
                        <Link href={backHref} className={styles.backButton}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m12 19-7-7 7-7" />
                                <path d="M19 12H5" />
                            </svg>
                            Back
                        </Link>
                    )}
                    {!showBackButton && (
                        <Link href="/" className={styles.logo}>
                            <span className={styles.logoIcon}>🌸</span>
                            <span className={styles.logoText}>Charlee Girl</span>
                        </Link>
                    )}
                    {title && <h1 className={styles.pageTitle}>{title}</h1>}
                </div>

                <nav className={styles.nav}>
                    <Link href="/history" className={styles.navLink}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        History
                    </Link>
                    <Link href="/settings" className={styles.navLink}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        Settings
                    </Link>
                </nav>
            </div>
        </header>
    );
}
