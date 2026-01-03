// Template Set = Product Type
// A template set is a collection of templates that represents a product type
// Users create their own template sets (e.g., "Lifeguard Straw Hat" with 5 templates)
export interface TemplateSet {
    id: string;
    name: string;
    icon: string;
    templates: ImageTemplate[];
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

// Alias for backward compatibility
export type ProductType = TemplateSet;

// Image Template (individual template within a set)
export interface ImageTemplate {
    id: string;
    name: string;
    templateImageUrl: string;
    /** @deprecated Use templateImageUrl with Vercel Blob URL instead */
    templateImageBase64?: string; // For local storage / legacy
    basePrompt: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

// Legacy alias
export type ImageType = ImageTemplate;

// Generation Session
export interface GenerationSession {
    id: string;
    productTypeId: string;
    patternImageUrl: string;
    patternName: string;
    outputSettings: OutputSettings;
    createdAt: Date;
    status: 'in_progress' | 'completed' | 'failed';
}

export interface OutputSettings {
    aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
    size: '1k' | '2k' | '4k';
}

// Generated Image
export interface GeneratedImage {
    id: string;
    sessionId: string;
    imageTypeId: string;
    templateImageUrl: string;
    promptUsed: string;
    promptModification?: string;
    generatedImageUrl?: string;
    status: 'pending' | 'generating' | 'completed' | 'failed';
    refinements: Refinement[];
    apiCost: number;
    createdAt: Date;
    errorMessage?: string;
}

export interface Refinement {
    id: string;
    prompt: string;
    resultImageUrl: string;
    createdAt: Date;
}

// Prompt Preset
export interface PromptPreset {
    id: string;
    name: string;
    promptText: string;
    createdAt: Date;
}

// Usage Log
export interface UsageLog {
    date: string;
    apiCalls: number;
    estimatedCostCents: number;
}

// Tool Card
export interface ToolCard {
    id: string;
    name: string;
    description: string;
    icon: string;
    href: string;
    enabled: boolean;
    sortOrder: number;
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface GenerationResult {
    imageUrl: string;
    prompt: string;
    estimatedCost: number;
}
