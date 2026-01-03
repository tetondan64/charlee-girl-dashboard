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
const fetchTemplateSets = async (): Promise<{ sets: TemplateSet[], version: string | null }> => {
    try {
        const response = await fetch('/api/templates');
        if (!response.ok) throw new Error('Failed to fetch templates');

        const version = response.headers.get('X-Version');
        const data = await response.json();

        // Convert date strings to Date objects
        const sets = data.map((set: TemplateSet) => ({
            ...set,
            createdAt: new Date(set.createdAt),
            updatedAt: new Date(set.updatedAt),
            templates: set.templates.map((t: ImageTemplate) => ({
                ...t,
                createdAt: new Date(t.createdAt),
                updatedAt: new Date(t.updatedAt),
            })),
        }));

        return { sets, version };
    } catch (error) {
        console.error('Failed to fetch template sets:', error);
        return { sets: [], version: null };
    }
};

const saveTemplateSetsToServer = async (sets: TemplateSet[], version: string | null): Promise<{ success: boolean, newVersion?: string, status?: number }> => {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (version) {
            headers['X-Version'] = version;
        }

        const response = await fetch('/api/templates', {
            method: 'PUT',
            headers,
            body: JSON.stringify(sets),
        });

        if (response.ok) {
            const newVersion = response.headers.get('X-Version') || undefined;
            return { success: true, newVersion, status: response.status };
        } else {
            return { success: false, status: response.status };
        }
    } catch (error) {
        console.error('Failed to save template sets:', error);
        return { success: false };
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

    // Ref to track if initial load is complete (to prevent saving during load)
    const initialLoadDoneRef = React.useRef(false);
    // Ref to track the current Version
    const lastVersionRef = React.useRef<string | null>(null);

    // Load function (extracted to allow invalidation)
    const loadFromServer = useCallback(async () => {
        try {
            const { sets, version } = await fetchTemplateSets();
            setTemplateSets(sets);
            lastVersionRef.current = version;

            if (sets.length > 0 && !selectedSetId) {
                setSelectedSetId(sets[0].id);
            }
            console.log('[TemplateSet] Loaded from server:', sets.length, 'sets. Version:', version);
        } catch (error) {
            console.error('[TemplateSet] Failed to load:', error);
        } finally {
            setIsLoaded(true);
            initialLoadDoneRef.current = true; // Enable saving after load
        }
    }, [selectedSetId]);

    // Load on mount
    useEffect(() => {
        loadFromServer();
    }, [loadFromServer]);

    // Simple save function - always saves the provided data immediately
    const saveToServer = useCallback(async (sets: TemplateSet[]) => {
        // Don't save during initial load
        if (!initialLoadDoneRef.current) {
            console.log('[TemplateSet] Skipping save (initial load not done)');
            return;
        }

        console.log('[TemplateSet] Saving', sets.length, 'sets to server. Version:', lastVersionRef.current);

        setIsSaving(true);
        try {
            const result = await saveTemplateSetsToServer(sets, lastVersionRef.current);

            if (result.success) {
                setLastSaved(new Date());
                if (result.newVersion) {
                    lastVersionRef.current = result.newVersion;
                }
                console.log('[TemplateSet] Save completed successfully. New Version:', result.newVersion);
            } else if (result.status === 409 || result.status === 428) {
                console.warn('[TemplateSet] Data conflict detected (Status ' + result.status + '). Reloading...');
                alert('Another session updated the templates. Reloading data...');
                await loadFromServer();
            } else {
                console.error('[TemplateSet] Save failed with status:', result.status);
            }
        } catch (error) {
            console.error('[TemplateSet] Failed to save:', error);
        } finally {
            setIsSaving(false);
        }
    }, [loadFromServer]);

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
        const newSets = [...templateSets, newSet];
        setTemplateSets(newSets);
        setSelectedSetId(newSet.id);
        saveToServer(newSets); // Save immediately after creating
    }, [templateSets, saveToServer]);

    const handleDeleteSet = useCallback((setId: string) => {
        const newSets = templateSets.filter(s => s.id !== setId);
        setTemplateSets(newSets);
        if (selectedSetId === setId) {
            setSelectedSetId(newSets[0]?.id || '');
        }
        saveToServer(newSets); // Save immediately after deleting
    }, [selectedSetId, templateSets, saveToServer]);

    const handleRenameSet = useCallback((setId: string, newName: string) => {
        const newSets = templateSets.map(s =>
            s.id === setId ? { ...s, name: newName, updatedAt: new Date() } : s
        );
        setTemplateSets(newSets);
        saveToServer(newSets); // Save immediately after renaming
    }, [templateSets, saveToServer]);

    // Template management within the current set - ALWAYS saves after changes
    const handleTemplatesChange = useCallback((newTemplates: ImageTemplate[], _saveNow: boolean = false) => {
        const updatedSets = templateSets.map(s =>
            s.id === selectedSetId
                ? { ...s, templates: newTemplates, updatedAt: new Date() }
                : s
        );
        setTemplateSets(updatedSets);

        // Always save after template changes
        saveToServer(updatedSets);
    }, [selectedSetId, templateSets, saveToServer]);

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

        // Filter to only templates with images
        const validTemplates = templates.filter(t =>
            t.templateImageBase64 || (t.templateImageUrl && !t.templateImageUrl.startsWith('blob:'))
        );

        if (validTemplates.length === 0) {
            alert('No templates have images. Please add images to your templates first.');
            return;
        }

        setIsGenerating(true);
        setWorkflowStep('generating');

        // Initialize all images as pending
        const initialImages: GeneratedImage[] = validTemplates.map(template => ({
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

        // Process each template with the real API
        for (let i = 0; i < validTemplates.length; i++) {
            const template = validTemplates[i];
            const imageId = initialImages[i].id;

            // Update status to generating
            setGeneratedImages(prev =>
                prev.map(img =>
                    img.id === imageId
                        ? { ...img, status: 'generating' as const }
                        : img
                )
            );

            try {
                // Build the prompt
                const fullPrompt = template.basePrompt +
                    (promptModifications[template.id] ? `\n\nAdditional instructions: ${promptModifications[template.id]}` : '');

                // Create FormData for the API call
                const formData = new FormData();

                // Get template image - need to convert base64 or URL to File
                let templateFile: File;
                if (template.templateImageBase64) {
                    // Convert base64 to File
                    const base64Data = template.templateImageBase64.split(',')[1] || template.templateImageBase64;
                    const mimeType = template.templateImageBase64.split(';')[0]?.split(':')[1] || 'image/png';
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let j = 0; j < byteCharacters.length; j++) {
                        byteNumbers[j] = byteCharacters.charCodeAt(j);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: mimeType });
                    templateFile = new File([blob], `template-${template.id}.png`, { type: mimeType });
                } else if (template.templateImageUrl) {
                    // Fetch the image from URL and convert to File
                    const response = await fetch(template.templateImageUrl);
                    const blob = await response.blob();
                    templateFile = new File([blob], `template-${template.id}.png`, { type: blob.type });
                } else {
                    throw new Error(`Template ${template.name} has no image`);
                }

                formData.append('clothing', templateFile);
                formData.append('pattern', patternImage);
                formData.append('prompt', fullPrompt);

                console.log(`[Generate] Processing template: ${template.name}`);

                // Call the real API
                const response = await fetch('/api/apply-pattern', {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Failed to generate image');
                }

                // Update with the generated image URL
                setGeneratedImages(prev =>
                    prev.map(img =>
                        img.id === imageId
                            ? {
                                ...img,
                                status: 'completed' as const,
                                generatedImageUrl: data.imageUrl,
                                apiCost: 0.02, // ~$0.02 per generation with Pro model
                            }
                            : img
                    )
                );

                console.log(`[Generate] Completed template: ${template.name}`);

            } catch (error) {
                console.error(`[Generate] Failed for template ${template.name}:`, error);

                // Mark as failed
                setGeneratedImages(prev =>
                    prev.map(img =>
                        img.id === imageId
                            ? {
                                ...img,
                                status: 'failed' as const,
                            }
                            : img
                    )
                );
            }
        }

        setIsGenerating(false);
        setWorkflowStep('results');
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

    // Count templates that have valid images
    const templatesWithImages = templates.filter(t =>
        t.templateImageBase64 || (t.templateImageUrl && !t.templateImageUrl.startsWith('blob:'))
    );
    const readyToGenerate = templatesWithImages.length;
    const canGenerate = patternImage && patternName.trim() && readyToGenerate > 0;

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
                                        Generate All Images ({readyToGenerate}{templates.length > readyToGenerate ? ` of ${templates.length}` : ''})
                                    </>
                                )}
                            </button>
                            {!canGenerate && (
                                <p className={styles.generateHint}>
                                    {templates.length === 0 && 'Add templates to your product type first'}
                                    {templates.length > 0 && readyToGenerate === 0 && 'Upload images for your templates first - click "Add New" and upload a photo'}
                                    {readyToGenerate > 0 && !patternImage && 'Upload a pattern image to continue'}
                                    {readyToGenerate > 0 && patternImage && !patternName.trim() && 'Enter a pattern name'}
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
