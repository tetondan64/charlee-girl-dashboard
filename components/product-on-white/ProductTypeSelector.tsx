'use client';

import React from 'react';
import styles from './ProductTypeSelector.module.css';

interface ProductTypeSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

const productTypes = [
    { id: 'lifeguard-hat', name: 'Lifeguard Straw Hat', icon: '🎩' },
    { id: 'harem-pants', name: 'Harem Pants', icon: '👖', disabled: true },
    { id: 'shorts', name: 'Shorts', icon: '🩳', disabled: true },
    { id: 'hip-bag', name: 'Hip Bag', icon: '👜', disabled: true },
    { id: 'bracelet-stack', name: 'Bracelet Stack', icon: '📿', disabled: true },
];

export default function ProductTypeSelector({ value, onChange }: ProductTypeSelectorProps) {
    return (
        <div className={styles.container}>
            <label htmlFor="productType" className={styles.label}>
                Product Type
            </label>
            <div className={styles.selectWrapper}>
                <select
                    id="productType"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={styles.select}
                >
                    {productTypes.map((type) => (
                        <option
                            key={type.id}
                            value={type.id}
                            disabled={type.disabled}
                        >
                            {type.icon} {type.name} {type.disabled ? '(Coming Soon)' : ''}
                        </option>
                    ))}
                </select>
            </div>
            <p className={styles.hint}>
                More product types coming soon!
            </p>
        </div>
    );
}
