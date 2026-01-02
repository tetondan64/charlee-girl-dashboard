'use client';

import React from 'react';
import ToolCard from './ToolCard';
import styles from './ToolGrid.module.css';
import { ToolCard as ToolCardType } from '@/types';

interface ToolGridProps {
    tools: ToolCardType[];
    onEditCard?: (id: string) => void;
}

export default function ToolGrid({ tools, onEditCard }: ToolGridProps) {
    return (
        <div className={styles.grid}>
            {tools.map((tool) => (
                <ToolCard
                    key={tool.id}
                    {...tool}
                    onEdit={onEditCard ? () => onEditCard(tool.id) : undefined}
                />
            ))}
        </div>
    );
}
