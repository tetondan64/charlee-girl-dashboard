'use client';

import React from 'react';
import styles from './OutputSettings.module.css';
import { OutputSettings as OutputSettingsType } from '@/types';

interface OutputSettingsProps {
    settings: OutputSettingsType;
    onChange: (settings: OutputSettingsType) => void;
}

const aspectRatios = [
    { value: '1:1', label: '1:1 (Square)' },
    { value: '4:3', label: '4:3 (Standard)' },
    { value: '3:4', label: '3:4 (Portrait)' },
    { value: '16:9', label: '16:9 (Wide)' },
    { value: '9:16', label: '9:16 (Tall)' },
];

const sizes = [
    { value: '1k', label: '1K (1024px)' },
    { value: '2k', label: '2K (2048px)' },
    { value: '4k', label: '4K (4096px)' },
];

export default function OutputSettings({ settings, onChange }: OutputSettingsProps) {
    return (
        <div className={styles.container}>
            <div className={styles.row}>
                <div className={styles.setting}>
                    <label htmlFor="aspectRatio" className={styles.label}>
                        Aspect Ratio
                    </label>
                    <select
                        id="aspectRatio"
                        value={settings.aspectRatio}
                        onChange={(e) =>
                            onChange({ ...settings, aspectRatio: e.target.value as OutputSettingsType['aspectRatio'] })
                        }
                        className={styles.select}
                    >
                        {aspectRatios.map((ratio) => (
                            <option key={ratio.value} value={ratio.value}>
                                {ratio.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.setting}>
                    <label htmlFor="size" className={styles.label}>
                        Image Size
                    </label>
                    <select
                        id="size"
                        value={settings.size}
                        onChange={(e) =>
                            onChange({ ...settings, size: e.target.value as OutputSettingsType['size'] })
                        }
                        className={styles.select}
                    >
                        {sizes.map((size) => (
                            <option key={size.value} value={size.value}>
                                {size.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className={styles.info}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                </svg>
                <span>
                    Larger sizes and higher quality will use more API credits.
                    2K is recommended for e-commerce.
                </span>
            </div>
        </div>
    );
}
