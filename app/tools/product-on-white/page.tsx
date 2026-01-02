'use client';

import React, { useState, useCallback } from 'react';
import styles from './page.module.css';
import Header from '@/components/layout/Header';
import ProductTypeSelector from '@/components/product-on-white/ProductTypeSelector';
import PatternUpload from '@/components/product-on-white/PatternUpload';
import TemplateGrid from '@/components/product-on-white/TemplateGrid';
import OutputSettings from '@/components/product-on-white/OutputSettings';
import GenerationResults from '@/components/product-on-white/GenerationResults';
import { ImageType, OutputSettings as OutputSettingsType, GeneratedImage } from '@/types';

// Default hat templates - will be replaced with actual templates
const defaultHatTemplates: ImageType[] = [
    {
        id: 'hat-front',
        productTypeId: 'lifeguard-hat',
        name: 'Front View',
        templateImageUrl: '/templates/hat-front.jpg',
        basePrompt: 'This is a product photo of a lifeguard-style straw hat on a white background. Apply the pattern from the reference image to the under-brim fabric of the hat, keeping all other elements identical including the straw weave texture, Charlee leather patch, and drawstring.',
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'hat-side',
        productTypeId: 'lifeguard-hat',
        name: 'Side View',
        templateImageUrl: '/templates/hat-side.jpg',
        basePrompt: 'This is a side view product photo of a lifeguard-style straw hat on a white background. Apply the pattern from the reference image to the visible under-brim fabric of the hat, keeping all other elements identical.',
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'hat-back',
        productTypeId: 'lifeguard-hat',
        name: 'Back View',
        templateImageUrl: '/templates/hat-back.jpg',
        basePrompt: 'This is a back view product photo of a lifeguard-style straw hat on a white background. Apply the pattern from the reference image to the under-brim fabric of the hat, keeping all other elements identical.',
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'hat-detail',
        productTypeId: 'lifeguard-hat',
        name: 'Under Brim Detail',
        templateImageUrl: '/templates/hat-detail.jpg',
        basePrompt: 'This is a detail shot showing the under-brim of a lifeguard-style straw hat. Apply the pattern from the reference image to the under-brim fabric, filling the visible fabric area with the pattern.',
        sortOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

type WorkflowStep = 'setup' | 'generating' | 'results';

export default function ProductOnWhitePage() {
    const [productType, setProductType] = useState('lifeguard-hat');
    const [patternImage, setPatternImage] = useState<File | null>(null);
    const [patternName, setPatternName] = useState('');
    const [templates, setTemplates] = useState<ImageType[]>(defaultHatTemplates);
    const [promptModifications, setPromptModifications] = useState<Record<string, string>>({});
    const [outputSettings, setOutputSettings] = useState<OutputSettingsType>({
        aspectRatio: '1:1',
        size: '2k',
    });
    const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('setup');
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const handlePatternUpload = useCallback((file: File) => {
        setPatternImage(file);
        // Extract name from filename
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
        if (!patternImage) return;

        setIsGenerating(true);
        setWorkflowStep('generating');

        // Create initial generated images in pending state
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

        // Simulate generation (in real app, this would call the Gemini API)
        // For now, we'll just show the UI flow
        setTimeout(() => {
            setGeneratedImages(prev =>
                prev.map(img => ({
                    ...img,
                    status: 'completed' as const,
                    generatedImageUrl: img.templateImageUrl, // In real app, this would be the generated image
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

        // Simulate regeneration
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
                        {/* Step 1: Product Type & Pattern */}
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.stepNumber}>1</span>
                                <div>
                                    <h2 className={styles.sectionTitle}>Select Product & Upload Pattern</h2>
                                    <p className={styles.sectionDescription}>
                                        Choose your product type and upload the pattern image
                                    </p>
                                </div>
                            </div>

                            <div className={styles.row}>
                                <div className={styles.column}>
                                    <ProductTypeSelector
                                        value={productType}
                                        onChange={setProductType}
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
                                    <h2 className={styles.sectionTitle}>Review Templates & Customize Prompts</h2>
                                    <p className={styles.sectionDescription}>
                                        Select templates and add any custom instructions
                                    </p>
                                </div>
                            </div>

                            <TemplateGrid
                                templates={templates}
                                promptModifications={promptModifications}
                                onPromptModification={handlePromptModification}
                                onTemplatesChange={setTemplates}
                            />
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
                                    {!patternImage && 'Upload a pattern image to continue'}
                                    {patternImage && !patternName.trim() && 'Enter a pattern name'}
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
