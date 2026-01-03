import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { TemplateSet } from '@/types';

// Force dynamic rendering and disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Initialize Redis client
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const TEMPLATES_KEY = 'charlee-girl-template-sets';
const VERSION_KEY = 'charlee-girl-template-sets:version';

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
                templateImageUrl: '', // Users must upload their own image
                basePrompt: 'Apply the pattern to the front view of the hat, maintaining the natural straw texture and shape.',
                sortOrder: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'side-view',
                name: 'Side View',
                templateImageUrl: '', // Users must upload their own image
                basePrompt: 'Apply the pattern to the side view of the hat, showing the full brim profile.',
                sortOrder: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        ],
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

// GET - Fetch all template sets
export async function GET() {
    try {
        console.log('[GET /api/templates] Fetching template sets from Redis...');
        // Fetch both data and version atomically-ish (pipeline)
        const [templateSets, version] = await redis.mget<[TemplateSet[] | null, string | null]>(TEMPLATES_KEY, VERSION_KEY);

        // Debug: log what we got from Redis
        console.log('[GET /api/templates] Raw Redis response:',
            templateSets === null ? 'NULL' : `${templateSets.length} sets`,
            'Version:', version
        );

        if (templateSets && templateSets.length > 0) {
            templateSets.forEach((set, i) => {
                console.log(`[GET /api/templates]   Set ${i}: "${set.name}" with ${set.templates?.length || 0} templates`);
            });
        }

        // Only create defaults if the key has NEVER been set (null)
        // An empty array [] means user intentionally deleted all templates
        if (templateSets === null) {
            // First time setup - create default template set
            console.log('[GET /api/templates] Creating default template set (first time setup)');
            const defaultSet = getDefaultTemplateSet();

            // Initialize data and version
            const pipeline = redis.pipeline();
            pipeline.set(TEMPLATES_KEY, [defaultSet]);
            pipeline.set(VERSION_KEY, '1');
            await pipeline.exec();

            const response = NextResponse.json([defaultSet]);
            response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            response.headers.set('X-Version', '1');
            return response;
        }

        // Return whatever is stored (including empty array if user deleted all)
        const response = NextResponse.json(templateSets);
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        if (version) {
            response.headers.set('X-Version', version);
        } else {
            // If data exists but version missing (migration), treat as version 1
            response.headers.set('X-Version', '1');
        }
        return response;
    } catch (error) {
        console.error('[GET /api/templates] Error:', error);
        // If Redis is not configured, return default data
        if (error instanceof Error && (error.message.includes('UPSTASH') || error.message.includes('Redis'))) {
            console.warn('[GET /api/templates] Redis not configured, returning default data');
            const defaultSet = getDefaultTemplateSet();
            const response = NextResponse.json([defaultSet]);
            response.headers.set('X-Version', '1');
            return response;
        }
        return NextResponse.json(
            { error: 'Failed to fetch template sets' },
            { status: 500 }
        );
    }
}

// Lua script to check version and update atomically
// KEYS[1] = version key, KEYS[2] = data key
// ARGV[1] = expected version, ARGV[2] = new data (json)
// Returns: new version (number) if success, -1 if conflict
const CAS_SCRIPT = `
    local current = redis.call('get', KEYS[1])
    -- If version missing (migration), assume '1' matches if client sent '1'
    if not current then current = '1' end
    
    if current == ARGV[1] then
        redis.call('set', KEYS[2], ARGV[2])
        return redis.call('incr', KEYS[1])
    else
        return -1
    end
`;

// POST - Create a new template set
export async function POST(request: Request) {
    try {
        const newSet: TemplateSet = await request.json();

        // Add timestamps
        newSet.createdAt = new Date();
        newSet.updatedAt = new Date();
        newSet.id = newSet.id || `set-${Date.now()}`;

        // CAS Loop to handle concurrency
        let attempts = 0;
        const MAX_ATTEMPTS = 5;

        while (attempts < MAX_ATTEMPTS) {
            attempts++;

            // 1. Fetch current data and version
            const [currentSets, currentVersion] = await redis.mget<[TemplateSet[] | null, string | null]>(TEMPLATES_KEY, VERSION_KEY);
            const templateSets = currentSets || [];
            const version = currentVersion || '1'; // Default to 1 if missing

            // 2. Modify
            templateSets.push(newSet);

            // 3. Try to save with CAS
            const result = await redis.eval(
                CAS_SCRIPT,
                [VERSION_KEY, TEMPLATES_KEY],
                [version, templateSets]
            );

            if (result !== -1) {
                // Success
                console.log(`[POST /api/templates] Successfully created set via CAS (Attempt ${attempts})`);
                const response = NextResponse.json(newSet, { status: 201 });
                response.headers.set('X-Version', String(result));
                return response;
            }

            // Conflict, retry
            console.warn(`[POST /api/templates] CAS Conflict (Attempt ${attempts}). Retrying...`);
            // Small jittered delay
            await new Promise(r => setTimeout(r, Math.random() * 100));
        }

        return NextResponse.json(
            { error: 'Failed to create template set due to high concurrency. Please try again.' },
            { status: 409 }
        );

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
        const clientVersion = request.headers.get('X-Version');

        // Enforce Version Check
        if (!clientVersion) {
            console.warn('[PUT /api/templates] Missing X-Version header');
            return NextResponse.json(
                { error: 'Precondition Required: Please refresh the page.' },
                { status: 428 }
            );
        }

        // Debug
        console.log('[PUT /api/templates] Received data to save for version:', clientVersion);
        console.log(`[PUT /api/templates]   Total sets: ${templateSets.length}`);

        // Update timestamps
        const updatedSets = templateSets.map(set => ({
            ...set,
            updatedAt: new Date(),
        }));

        console.log('[PUT /api/templates] Saving to Redis with Optimistic Locking...');

        const result = await redis.eval(
            CAS_SCRIPT,
            [VERSION_KEY, TEMPLATES_KEY],
            [clientVersion, updatedSets]
        );

        console.log('[PUT /api/templates] Redis eval result:', result);

        if (result === -1) {
            console.warn('[PUT /api/templates] Conflict detected. Client version:', clientVersion);
            return NextResponse.json(
                { error: 'Conflict: Data has changed on server. Please refresh.' },
                { status: 409 }
            );
        }

        const newVersion = String(result);
        console.log('[PUT /api/templates] Successfully saved. New version:', newVersion);

        const response = NextResponse.json(updatedSets);
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        response.headers.set('X-Version', newVersion);
        return response;
    } catch (error) {
        console.error('[PUT /api/templates] Error:', error);
        return NextResponse.json(
            { error: 'Failed to update template sets' },
            { status: 500 }
        );
    }
}
