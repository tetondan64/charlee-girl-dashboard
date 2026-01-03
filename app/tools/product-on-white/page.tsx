'use client';

import React, { useState, useCallback, useEffect } from 'react';
import styles from './page.module.css';
import Header from '@/components/layout/Header';
import TemplateSetSelector from '@/components/product-on-white/TemplateSetSelector';
import PatternUpload from '@/components/product-on-white/PatternUpload';
import TemplateGrid from '@/components/product-on-white/TemplateGrid';
import OutputSettings from '@/components/product-on-white/OutputSettings';
import GenerationResults from '@/components/product-on-white/GenerationResults';
import { TemplateSet, ImageTemplate, OutputSettings as OutputSettingsType, GeneratedImage } from '@/types';

// API functions for server-side persistence
const fetchTemplateSets = async (): Promise<TemplateSet[]> => {
    try {
        const response = await fetch('/api/templates');
        if (!response.ok) throw new Error('Failed to fetch templates');
        const data = await response.json();
        // Convert date strings to Date objects
        return data.map((set: TemplateSet) => ({
            ...set,
            createdAt: new Date(set.createdAt),
            updatedAt: new Date(set.updatedAt),
            templates: set.templates.map((t: ImageTemplate) => ({
                ...t,
                createdAt: new Date(t.createdAt),
                updatedAt: new Date(t.updatedAt),
            })),
        }));
    } catch (error) {
        console.error('Failed to fetch template sets:', error);
        return [];
    }
};

const saveTemplateSetsToServer = async (sets: TemplateSet[]): Promise<boolean> => {
    try {
        const response = await fetch('/api/templates', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sets),
        });
        return response.ok;
    } catch (error) {
        console.error('Failed to save template sets:', error);
        return false;
    }
};


type WorkflowStep = 'setup' | 'generating' | 'results';

export default function ProductOnWhitePage() {
    const [templateSets, setTemplateSets] = useState<TemplateSet[]>([]);
    const [selectedSetId, setSelectedSetId] = useState<string>('');
    const [patternImage, setPatternImage] = useState<File | null>(null);
    const [patternName, setPatternName] = useState('');
    const [promptModifications, setPromptModifications] = useState<Record<string, string>>({});
    const [outputSettings, setOutputSettings] = useState<OutputSettingsType>({
        aspectRatio: '1:1',
        size: '2k',
    });
    const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('setup');
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Load on mount from server
    useEffect(() => {
        const loadFromServer = async () => {
            try {
                const sets = await fetchTemplateSets();
                setTemplateSets(sets);
                if (sets.length > 0) {
                    setSelectedSetId(sets[0].id);
                }
                console.log('[TemplateSet] Loaded from server:', sets.length, 'sets');
            } catch (error) {
                console.error('[TemplateSet] Failed to load:', error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadFromServer();
    }, []);

    // Save when template sets change (debounced)
    useEffect(() => {
        if (!isLoaded || isSaving) return;

        const saveToServer = async () => {
            setIsSaving(true);
            try {
                const success = await saveTemplateSetsToServer(templateSets);
                if (success) {
                    setLastSaved(new Date());
                    console.log('[TemplateSet] Saved to server:', templateSets.length, 'sets');
                }
            } catch (error) {
                console.error('[TemplateSet] Failed to save:', error);
            } finally {
                setIsSaving(false);
            }
        };

        // Debounce saves to avoid too many requests
        const timeoutId = setTimeout(saveToServer, 500);
        return () => clearTimeout(timeoutId);
    }, [templateSets, isLoaded, isSaving]);

    const selectedSet = templateSets.find(s => s.id === selectedSetId);
    const templates = selectedSet?.templates || [];

    // Template set management
    const handleCreateSet = useCallback((name: string, icon: string) => {
        const newSet: TemplateSet = {
            id: `set-${Date.now()}`,
            name,
            icon,
            templates: [],
            sortOrder: templateSets.length,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        setTemplateSets(prev => [...prev, newSet]);
        setSelectedSetId(newSet.id);
    }, [templateSets.length]);

    const handleDeleteSet = useCallback((setId: string) => {
        setTemplateSets(prev => prev.filter(s => s.id !== setId));
        if (selectedSetId === setId) {
            const remaining = templateSets.filter(s => s.id !== setId);
            setSelectedSetId(remaining[0]?.id || '');
        }
    }, [selectedSetId, templateSets]);

    const handleRenameSet = useCallback((setId: string, newName: string) => {
        setTemplateSets(prev => prev.map(s =>
            s.id === setId ? { ...s, name: newName, updatedAt: new Date() } : s
        ));
    }, []);

    // Immediate save function (bypasses debounce for critical operations like delete)
    const saveImmediately = useCallback(async (sets: TemplateSet[]) => {
        setIsSaving(true);
        try {
            const success = await saveTemplateSetsToServer(sets);
            if (success) {
                setLastSaved(new Date());
                console.log('[TemplateSet] Saved immediately to server');
            }
        } catch (error) {
            console.error('[TemplateSet] Failed to save:', error);
        } finally {
            setIsSaving(false);
        }
    }, []);

    // Template management within the current set
    const handleTemplatesChange = useCallback((newTemplates: ImageTemplate[], saveNow: boolean = false) => {
        const updatedSets = templateSets.map(s =>
            s.id === selectedSetId
                ? { ...s, templates: newTemplates, updatedAt: new Date() }
                : s
        );
        setTemplateSets(updatedSets);

        // If saveNow is true (e.g., for deletions), save immediately
        if (saveNow) {
            saveImmediately(updatedSets);
        }
    }, [selectedSetId, templateSets, saveImmediately]);

    const handlePatternUpload = useCallback((file: File) => {
        setPatternImage(file);
        const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setPatternName(name);
    }, []);

    const handlePromptModification = useCallback((templateId: string, modification: string) => {
        setPromptModifications(prev => ({
            ...prev,
            [templateId]: modification,
        }));
    }, []);

    const handleGenerate = async () => {
        if (!patternImage || !selectedSet) return;

        setIsGenerating(true);
        setWorkflowStep('generating');

        const initialImages: GeneratedImage[] = templates.map(template => ({
            id: `gen-${template.id}-${Date.now()}`,
            sessionId: `session-${Date.now()}`,
            imageTypeId: template.id,
            templateImageUrl: template.templateImageUrl,
            promptUsed: template.basePrompt + (promptModifications[template.id] ? `\n\nAdditional instructions: ${promptModifications[template.id]}` : ''),
            promptModification: promptModifications[template.id],
            status: 'pending' as const,
            refinements: [],
            apiCost: 0,
            createdAt: new Date(),
        }));

        setGeneratedImages(initialImages);

        // Simulate generation (replace with actual API call)
        setTimeout(() => {
            setGeneratedImages(prev =>
                prev.map(img => ({
                    ...img,
                    status: 'completed' as const,
                    generatedImageUrl: img.templateImageUrl,
                    apiCost: 0.05,
                }))
            );
            setIsGenerating(false);
            setWorkflowStep('results');
        }, 3000);
    };

    const handleRegenerate = async (imageId: string, refinementPrompt: string) => {
        setGeneratedImages(prev =>
            prev.map(img =>
                img.id === imageId
                    ? { ...img, status: 'generating' as const }
                    : img
            )
        );

        setTimeout(() => {
            setGeneratedImages(prev =>
                prev.map(img =>
                    img.id === imageId
                        ? {
                            ...img,
                            status: 'completed' as const,
                            refinements: [
                                ...img.refinements,
                                {
                                    id: `ref-${Date.now()}`,
                                    prompt: refinementPrompt,
                                    resultImageUrl: img.templateImageUrl,
                                    createdAt: new Date(),
                                },
                            ],
                            apiCost: img.apiCost + 0.03,
                        }
                        : img
                )
            );
        }, 2000);
    };

    const handleBack = () => {
        setWorkflowStep('setup');
        setGeneratedImages([]);
    };

    const canGenerate = patternImage && patternName.trim() && templates.length > 0;

    if (!isLoaded) {
        return (
            <div className={styles.page}>
                <Header showBackButton backHref="/" title="Product on White Generator" />
                <main className={styles.main}>
                    <div className={styles.loading}>Loading...</div>
                </main>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <Header
                showBackButton
                backHref="/"
                title="Product on White Generator"
            />

            <main className={styles.main}>
                {workflowStep === 'setup' && (
                    <div className={styles.setupContainer}>
                        {/* Step 1: Template Set & Pattern */}
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.stepNumber}>1</span>
                                <div>
                                    <h2 className={styles.sectionTitle}>Select Product Type & Upload Pattern</h2>
                                    <p className={styles.sectionDescription}>
                                        Choose a template set (product type) and upload your pattern
                                    </p>
                                </div>
                            </div>

                            <div className={styles.row}>
                                <div className={styles.column}>
                                    <TemplateSetSelector
                                        templateSets={templateSets}
                                        selectedSetId={selectedSetId}
                                        onSelectSet={setSelectedSetId}
                                        onCreateSet={handleCreateSet}
                                        onDeleteSet={handleDeleteSet}
                                        onRenameSet={handleRenameSet}
                                    />
                                </div>
                                <div className={styles.column}>
                                    <PatternUpload
                                        onUpload={handlePatternUpload}
                                        patternName={patternName}
                                        onPatternNameChange={setPatternName}
                                        currentFile={patternImage}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Step 2: Template Images */}
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.stepNumber}>2</span>
                                <div>
                                    <h2 className={styles.sectionTitle}>Manage Templates & Customize Prompts</h2>
                                    <p className={styles.sectionDescription}>
                                        Add templates to &quot;{selectedSet?.name || 'your product type'}&quot; and customize prompts
                                        {lastSaved && (
                                            <span className={styles.savedIndicator}>
                                                ✓ Auto-saved
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {selectedSet ? (
                                <TemplateGrid
                                    templates={templates}
                                    promptModifications={promptModifications}
                                    onPromptModification={handlePromptModification}
                                    onTemplatesChange={handleTemplatesChange}
                                />
                            ) : (
                                <div className={styles.emptyState}>
                                    <p>Create a template set above to get started</p>
                                </div>
                            )}
                        </section>

                        {/* Step 3: Output Settings */}
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.stepNumber}>3</span>
                                <div>
                                    <h2 className={styles.sectionTitle}>Output Settings</h2>
                                    <p className={styles.sectionDescription}>
                                        Configure image format and quality
                                    </p>
                                </div>
                            </div>

                            <OutputSettings
                                settings={outputSettings}
                                onChange={setOutputSettings}
                            />
                        </section>

                        {/* Generate Button */}
                        <div className={styles.generateSection}>
                            <button
                                className={styles.generateButton}
                                onClick={handleGenerate}
                                disabled={!canGenerate || isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <span className={styles.spinner}></span>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                                        </svg>
                                        Generate All Images ({templates.length})
                                    </>
                                )}
                            </button>
                            {!canGenerate && (
                                <p className={styles.generateHint}>
                                    {templates.length === 0 && 'Add templates to your product type first'}
                                    {templates.length > 0 && !patternImage && 'Upload a pattern image to continue'}
                                    {templates.length > 0 && patternImage && !patternName.trim() && 'Enter a pattern name'}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {workflowStep === 'generating' && (
                    <div className={styles.generatingContainer}>
                        <div className={styles.generatingContent}>
                            <div className={styles.generatingSpinner}></div>
                            <h2>Generating Images...</h2>
                            <p>This may take a minute. Please don&apos;t close this page.</p>
                            <div className={styles.progressBar}>
                                <div className={styles.progressFill}></div>
                            </div>
                        </div>
                    </div>
                )}

                {workflowStep === 'results' && (
                    <GenerationResults
                        images={generatedImages}
                        templates={templates}
                        patternName={patternName}
                        onRegenerate={handleRegenerate}
                        onBack={handleBack}
                    />
                )}
            </main>
        </div>
    );
}
