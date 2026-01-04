'use client';

import React from 'react';
import Header from '@/components/layout/Header';
import styles from './page.module.css';

export default function ProductPageDescription() {
    return (
        <div className={styles.page}>
            <Header />
            <main className={styles.main}>
                <div className={styles.container}>
                    <iframe
                        src="https://claude.site/public/artifacts/7548a998-4e4f-4232-8530-fe6f99d8588f/embed"
                        title="Claude Artifact"
                        width="100%"
                        height="800"
                        style={{ border: 'none', borderRadius: '12px', background: 'white' }}
                        allow="clipboard-write"
                        allowFullScreen
                    ></iframe>
                </div>
            </main>
        </div>
    );
}
