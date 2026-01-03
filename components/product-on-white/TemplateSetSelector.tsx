'use client';

import React, { useState } from 'react';
import styles from './TemplateSetSelector.module.css';
import { TemplateSet } from '@/types';

interface TemplateSetSelectorProps {
    templateSets: TemplateSet[];
    selectedSetId: string;
    onSelectSet: (setId: string) => void;
    onCreateSet: (name: string, icon: string) => void;
    onDeleteSet: (setId: string) => void;
    onRenameSet: (setId: string, newName: string) => void;
}

const EMOJI_OPTIONS = ['🎩', '👖', '👜', '📿', '👕', '👗', '🩳', '🧥', '👒', '🎒'];

export default function TemplateSetSelector({
    templateSets,
    selectedSetId,
    onSelectSet,
    onCreateSet,
    onDeleteSet,
    onRenameSet,
}: TemplateSetSelectorProps) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [newSetName, setNewSetName] = useState('');
    const [newSetIcon, setNewSetIcon] = useState('🎩');
    const [editingSetId, setEditingSetId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const selectedSet = templateSets.find(s => s.id === selectedSetId);

    const handleCreate = () => {
        if (newSetName.trim()) {
            onCreateSet(newSetName.trim(), newSetIcon);
            setNewSetName('');
            setNewSetIcon('🎩');
            setShowCreateModal(false);
        }
    };

    const handleStartEdit = (set: TemplateSet) => {
        setEditingSetId(set.id);
        setEditingName(set.name);
    };

    const handleSaveEdit = () => {
        if (editingSetId && editingName.trim()) {
            onRenameSet(editingSetId, editingName.trim());
            setEditingSetId(null);
            setEditingName('');
        }
    };

    const handleDelete = (setId: string) => {
        if (confirm('Delete this product type? This will remove all its templates.')) {
            onDeleteSet(setId);
        }
    };

    return (
        <div className={styles.container}>
            <label className={styles.label}>Product Type (Template Set)</label>

            <div className={styles.selectorRow}>
                <div className={styles.selectWrapper}>
                    <select
                        value={selectedSetId}
                        onChange={(e) => onSelectSet(e.target.value)}
                        className={styles.select}
                    >
                        {templateSets.length === 0 && (
                            <option value="">No product types yet</option>
                        )}
                        {templateSets.map((set) => (
                            <option key={set.id} value={set.id}>
                                {set.icon} {set.name} ({(set.templates || []).length} templates)
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="button"
                    onClick={() => setShowManageModal(true)}
                    className={styles.manageButton}
                    title="Manage product types"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </button>

                <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className={styles.addButton}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                    </svg>
                    New
                </button>
            </div>

            {selectedSet && (
                <p className={styles.hint}>
                    {(selectedSet.templates || []).length} template{(selectedSet.templates || []).length !== 1 ? 's' : ''} in this set
                </p>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Create New Product Type</h3>
                        <p className={styles.modalDescription}>
                            Create a template set for a new product type. You can add templates after creating it.
                        </p>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Name</label>
                            <input
                                type="text"
                                value={newSetName}
                                onChange={(e) => setNewSetName(e.target.value)}
                                placeholder="e.g., Lifeguard Straw Hat"
                                className={styles.formInput}
                                autoFocus
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Icon</label>
                            <div className={styles.iconGrid}>
                                {EMOJI_OPTIONS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setNewSetIcon(emoji)}
                                        className={`${styles.iconButton} ${newSetIcon === emoji ? styles.iconSelected : ''}`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className={styles.cancelButton}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCreate}
                                className={styles.submitButton}
                                disabled={!newSetName.trim()}
                            >
                                Create Product Type
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Modal */}
            {showManageModal && (
                <div className={styles.modalOverlay} onClick={() => setShowManageModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Manage Product Types</h3>
                        <p className={styles.modalDescription}>
                            Edit or delete your product types (template sets).
                        </p>

                        <div className={styles.setList}>
                            {templateSets.length === 0 && (
                                <p className={styles.emptyMessage}>No product types yet. Create one to get started!</p>
                            )}
                            {templateSets.map((set) => (
                                <div key={set.id} className={styles.setItem}>
                                    {editingSetId === set.id ? (
                                        <div className={styles.editRow}>
                                            <span className={styles.setIcon}>{set.icon}</span>
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                className={styles.editInput}
                                                autoFocus
                                            />
                                            <button onClick={handleSaveEdit} className={styles.saveButton}>
                                                Save
                                            </button>
                                            <button onClick={() => setEditingSetId(null)} className={styles.cancelEditButton}>
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className={styles.setIcon}>{set.icon}</span>
                                            <span className={styles.setName}>{set.name}</span>
                                            <span className={styles.templateCount}>
                                                {(set.templates || []).length} templates
                                            </span>
                                            <button
                                                onClick={() => handleStartEdit(set)}
                                                className={styles.editButton}
                                                title="Rename"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(set.id)}
                                                className={styles.deleteButton}
                                                title="Delete"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 6h18" />
                                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                onClick={() => setShowManageModal(false)}
                                className={styles.submitButton}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
