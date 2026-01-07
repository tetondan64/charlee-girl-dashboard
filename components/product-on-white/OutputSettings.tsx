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
                <div className={styles.settingGroup}>
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

                <div className={styles.settingGroup}>
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
                    {/* Consistency Toggle - Redesigned as Switch */}
                    <div className={styles.settingGroup} style={{ marginBottom: '1.5rem' }}>
                        <label className={styles.switchLabel}>
                            <div>
                                <span className={styles.label} style={{ marginBottom: 0 }}>Consistency Mode</span>
                                <p style={{ fontSize: '0.8rem', color: '#718096', fontWeight: 400 }}>
                                    Forces strict settings for reproducible results
                                </p>
                            </div>
                            <div className={styles.toggleSwitch}>
                                <input
                                    type="checkbox"
                                    checked={!!settings.enableConsistency}
                                    onChange={(e) => handleConsistencyToggle(e.target.checked)}
                                />
                                <span className={styles.slider}></span>
                            </div>
                        </label>
                    </div>

                    <div className={styles.grid2}>
                        {/* Temperature */}
                        <div className={styles.settingGroup} style={{ opacity: settings.enableConsistency ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <label htmlFor="temperature" className={styles.label} style={{ margin: 0 }}>Temperature</label>
                                <span style={{ fontSize: '0.8rem', color: '#718096', fontFamily: 'monospace' }}>
                                    {settings.temperature?.toFixed(1) ?? '1.0'}
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
                        <div className={styles.settingGroup} style={{ opacity: settings.enableConsistency ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                            <label htmlFor="seed" className={styles.label}>Seed (Randomness)</label>
                            <input
                                type="number"
                                id="seed"
                                value={settings.seed ?? 42}
                                disabled={!!settings.enableConsistency}
                                onChange={(e) => onChange({ ...settings, seed: parseInt(e.target.value) || 0 })}
                                className={styles.input}
                                placeholder="e.g. 42"
                            />
                        </div>
                    </div>

                    {/* File Name Prefix */}
                    <div className={styles.settingGroup} style={{ marginTop: '1.5rem' }}>
                        <label htmlFor="filenamePrefix" className={styles.label}>File Naming Prefix</label>
                        <input
                            type="text"
                            id="filenamePrefix"
                            value={settings.filenamePrefix || ''}
                            onChange={(e) => onChange({ ...settings, filenamePrefix: e.target.value })}
                            className={styles.input}
                            placeholder="Optional (e.g. Tenley)"
                        />
                        <p style={{ fontSize: '0.75rem', color: '#a0aec0', marginTop: '4px' }}>
                            Leave empty to use the pattern name.
                        </p>
                    </div>
                </div>
            </div>

            <div className={styles.info}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                </svg>
                <span>
                    <strong>Pro Tip:</strong> Larger sizes use more credits. 2K is recommended for e-commerce.
                </span>
            </div>
        </div>
    );
}
