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
    const [showAdvanced, setShowAdvanced] = React.useState(false);

    // Toggle consistency mode
    const handleConsistencyToggle = (enabled: boolean) => {
        onChange({
            ...settings,
            enableConsistency: enabled,
            // When enabling, auto-set deterministic values if not already set
            temperature: enabled ? 0.0 : (settings.temperature ?? 1.0),
            seed: enabled ? 42 : (settings.seed ?? Math.floor(Math.random() * 2000000000))
        });
    };

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

            <div className={styles.advancedSection}>
                <div
                    className={styles.toggleHeader}
                    onClick={() => setShowAdvanced(!showAdvanced)}
                >
                    <div className={styles.toggleLabel}>
                        <span className={styles.toggleTitle}>Advanced Settings</span>
                        <span className={styles.toggleDescription}>
                            {settings.enableConsistency ? 'Consistency Mode is ON' : 'Customize generation parameters'}
                        </span>
                    </div>
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </div>

                <div className={`${styles.advancedControls} ${showAdvanced ? styles.active : ''}`}>
                    {/* Consistency Toggle */}
                    <div className={styles.settingGroup}>
                        <div className={styles.switch}>
                            <input
                                type="checkbox"
                                id="consistencyMode"
                                checked={!!settings.enableConsistency}
                                onChange={(e) => handleConsistencyToggle(e.target.checked)}
                                className={styles.checkbox}
                            />
                            <label htmlFor="consistencyMode" style={{ marginLeft: '10px', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>
                                Consistency Mode
                            </label>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                            When checked, this forces strict settings (Temp 0, Fixed Seed) for 100% reproducible results.
                            <br />
                            <strong>Uncheck to manually adjust Temperature and Seed.</strong>
                        </p>
                    </div>

                    {/* Temperature */}
                    <div className={styles.settingGroup} style={{ opacity: settings.enableConsistency ? 0.7 : 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <label htmlFor="temperature" className={styles.label}>Temperature</label>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {settings.temperature ?? 1.0}
                            </span>
                        </div>
                        <input
                            type="range"
                            id="temperature"
                            min="0"
                            max="1"
                            step="0.1"
                            value={settings.temperature ?? 1.0}
                            disabled={!!settings.enableConsistency}
                            onChange={(e) => onChange({ ...settings, temperature: parseFloat(e.target.value) })}
                            className={styles.rangeInput}
                        />
                    </div>

                    {/* Seed */}
                    <div className={styles.settingGroup} style={{ opacity: settings.enableConsistency ? 0.7 : 1 }}>
                        <label htmlFor="seed" className={styles.label}>Seed (Randomness)</label>
                        <input
                            type="number"
                            id="seed"
                            value={settings.seed ?? 42}
                            disabled={!!settings.enableConsistency}
                            onChange={(e) => onChange({ ...settings, seed: parseInt(e.target.value) || 0 })}
                            className={styles.numberInput}
                            placeholder="e.g. 42"
                        />
                    </div>
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
