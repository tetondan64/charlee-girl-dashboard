import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { TemplateSet } from '@/types';

// Initialize Redis client
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const TEMPLATES_KEY = 'charlee-girl-template-sets';

// Default template set to use when no data exists
function getDefaultTemplateSet(): TemplateSet {
    return {
        id: 'lifeguard-straw-hat',
        name: 'Lifeguard Straw Hat',
        icon: '🎩',
        templates: [
            {
                id: 'front-view',
                name: 'Front View',
                templateImageUrl: '',
                basePrompt: 'Apply the pattern to the front view of the hat, maintaining the natural straw texture and shape.',
                sortOrder: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'side-view',
                name: 'Side View',
                templateImageUrl: '',
                basePrompt: 'Apply the pattern to the side view of the hat, showing the full brim profile.',
                sortOrder: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ],
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

// GET - Fetch all template sets
export async function GET() {
    try {
        const templateSets = await redis.get<TemplateSet[]>(TEMPLATES_KEY);

        // Only create defaults if the key has NEVER been set (null)
        // An empty array [] means user intentionally deleted all templates
        if (templateSets === null) {
            // First time setup - create default template set
            const defaultSet = getDefaultTemplateSet();
            await redis.set(TEMPLATES_KEY, [defaultSet]);
            return NextResponse.json([defaultSet]);
        }

        // Return whatever is stored (including empty array if user deleted all)
        return NextResponse.json(templateSets);
    } catch (error) {
        console.error('Error fetching template sets:', error);
        // If Redis is not configured, return default data
        if (error instanceof Error && (error.message.includes('UPSTASH') || error.message.includes('Redis'))) {
            console.warn('Upstash Redis not configured, returning default data');
            return NextResponse.json([getDefaultTemplateSet()]);
        }
        return NextResponse.json(
            { error: 'Failed to fetch template sets' },
            { status: 500 }
        );
    }
}

// POST - Create a new template set
export async function POST(request: Request) {
    try {
        const newSet: TemplateSet = await request.json();

        // Add timestamps
        newSet.createdAt = new Date();
        newSet.updatedAt = new Date();
        newSet.id = newSet.id || `set-${Date.now()}`;

        const templateSets = await redis.get<TemplateSet[]>(TEMPLATES_KEY) || [];
        templateSets.push(newSet);
        await redis.set(TEMPLATES_KEY, templateSets);

        return NextResponse.json(newSet, { status: 201 });
    } catch (error) {
        console.error('Error creating template set:', error);
        return NextResponse.json(
            { error: 'Failed to create template set' },
            { status: 500 }
        );
    }
}

// PUT - Update all template sets (full replacement)
export async function PUT(request: Request) {
    try {
        const templateSets: TemplateSet[] = await request.json();

        // Update timestamps
        const updatedSets = templateSets.map(set => ({
            ...set,
            updatedAt: new Date(),
        }));

        await redis.set(TEMPLATES_KEY, updatedSets);

        return NextResponse.json(updatedSets);
    } catch (error) {
        console.error('Error updating template sets:', error);
        return NextResponse.json(
            { error: 'Failed to update template sets' },
            { status: 500 }
        );
    }
}

// DELETE - Delete a template set by ID
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const setId = searchParams.get('id');

        if (!setId) {
            return NextResponse.json(
                { error: 'Template set ID is required' },
                { status: 400 }
            );
        }

        const templateSets = await redis.get<TemplateSet[]>(TEMPLATES_KEY) || [];
        const filteredSets = templateSets.filter(set => set.id !== setId);
        await redis.set(TEMPLATES_KEY, filteredSets);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting template set:', error);
        return NextResponse.json(
            { error: 'Failed to delete template set' },
            { status: 500 }
        );
    }
}
