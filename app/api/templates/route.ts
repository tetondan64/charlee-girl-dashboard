import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { TemplateSet } from '@/types';

// Force dynamic rendering and disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Initialize Redis client safely
const redisClient = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

// In-memory fallback for development without Redis
// Note: This resets on server restart/recompile
let memoryStore: { templates: TemplateSet[] | null, version: string } = {
    templates: null,
    version: '1'
};

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
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'side-view',
                name: 'Side View',
                templateImageUrl: '', // Users must upload their own image
                basePrompt: 'Apply the pattern to the side view of the hat, showing the full brim profile.',
                sortOrder: 1,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        ],
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

// Lua script to check version and update atomically
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

// GET - Fetch all template sets
export async function GET() {
    try {
        console.log('[GET /api/templates] Fetching template sets...');

        let templateSets: TemplateSet[] | null = null;
        let version: string | null = null;

        if (redisClient) {
            console.log('[GET /api/templates] Fetching from Redis...');
            const [redisSets, redisVersion] = await redisClient.mget<[TemplateSet[] | null, string | null]>(TEMPLATES_KEY, VERSION_KEY);
            templateSets = redisSets;
            version = redisVersion;
        } else {
            console.warn('[GET /api/templates] Redis not configured, using in-memory store');
            templateSets = memoryStore.templates;
            version = memoryStore.version;
        }

        // Only create defaults if the key has NEVER been set (null)
        if (templateSets === null) {
            console.log('[GET /api/templates] Creating default template set (first time setup)');
            const defaultSet = getDefaultTemplateSet();
            templateSets = [defaultSet];
            version = '1';

            if (redisClient) {
                const pipeline = redisClient.pipeline();
                pipeline.set(TEMPLATES_KEY, templateSets);
                pipeline.set(VERSION_KEY, version);
                await pipeline.exec();
            } else {
                memoryStore = { templates: templateSets, version };
            }

            const response = NextResponse.json(templateSets);
            response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            response.headers.set('X-Version', version);
            response.headers.set('Access-Control-Expose-Headers', 'X-Version');
            return response;
        }

        const response = NextResponse.json(templateSets);
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        if (version) {
            response.headers.set('X-Version', version);
        } else {
            response.headers.set('X-Version', '1');
        }
        response.headers.set('Access-Control-Expose-Headers', 'X-Version');
        return response;

    } catch (error) {
        console.error('[GET /api/templates] Error:', error);
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
        const setResponse = {
            ...newSet,
            templates: newSet.templates || [], // Ensure templates array exists
            createdAt: new Date(),
            updatedAt: new Date(),
            id: newSet.id || `set-${Date.now()}`
        };
        const setStore = setResponse; // alias for clarity in memory store logic

        if (!redisClient) {
            console.log('[POST /api/templates] Saving to in-memory store');
            // Ensure defaults exist if memory is fresh
            if (memoryStore.templates === null) {
                memoryStore.templates = [getDefaultTemplateSet()];
                memoryStore.version = '1';
            }

            memoryStore.templates.push(setStore);
            const newVersion = String(parseInt(memoryStore.version) + 1);
            memoryStore.version = newVersion;

            const response = NextResponse.json(setStore, { status: 201 });
            response.headers.set('X-Version', newVersion);
            response.headers.set('Access-Control-Expose-Headers', 'X-Version');
            return response;
        }

        // CAS Loop to handle concurrency
        let attempts = 0;
        const MAX_ATTEMPTS = 5;

        while (attempts < MAX_ATTEMPTS) {
            attempts++;

            // 1. Fetch current data and version
            const [currentSets, currentVersion] = await redisClient.mget<[TemplateSet[] | null, string | null]>(TEMPLATES_KEY, VERSION_KEY);
            const templateSets = currentSets || [];
            const version = currentVersion || '1'; // Default to 1 if missing

            // 2. Modify
            templateSets.push(setStore);

            // 3. Try to save with CAS
            const result = await redisClient.eval(
                CAS_SCRIPT,
                [VERSION_KEY, TEMPLATES_KEY],
                [version, templateSets]
            );

            if (result !== -1) {
                // Success
                console.log(`[POST /api/templates] Successfully created set via CAS (Attempt ${attempts})`);
                const response = NextResponse.json(setStore, { status: 201 });
                response.headers.set('X-Version', String(result));
                response.headers.set('Access-Control-Expose-Headers', 'X-Version');
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

        // Update timestamps
        const updatedSets = templateSets.map(set => ({
            ...set,
            updatedAt: new Date(),
        }));

        if (!redisClient) {
            console.log('[PUT /api/templates] Saving to in-memory store');

            // Simple version check (can be stricter)
            // In memory store might have been reset, allow '1' if memory is messed up?
            // No, strict optimistic locking is better to simulate real behavior.

            if (memoryStore.version !== clientVersion) {
                // But wait, if memoryStore.version initialized to '1' and client sends '1', it works.
                // If memoryStore reset and client sends '5' from old session, it fails.
                // We should accept if client sends '1' and memory is default? 
                // Let's just do strict check.
                if (memoryStore.version !== clientVersion) {
                    console.warn(`[PUT /api/templates] Conflict: Client ${clientVersion} vs Memory ${memoryStore.version}`);
                    return NextResponse.json(
                        { error: 'Conflict: Data has changed on server. Please refresh.' },
                        { status: 409 }
                    );
                }
            }

            memoryStore.templates = updatedSets;
            const newVersion = String(parseInt(memoryStore.version) + 1);
            memoryStore.version = newVersion;

            const response = NextResponse.json(updatedSets);
            response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            response.headers.set('X-Version', newVersion);
            response.headers.set('Access-Control-Expose-Headers', 'X-Version');
            return response;
        }

        console.log('[PUT /api/templates] Saving to Redis with Optimistic Locking...');

        const result = await redisClient.eval(
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
        response.headers.set('Access-Control-Expose-Headers', 'X-Version');
        return response;
    } catch (error) {
        console.error('[PUT /api/templates] Error:', error);
        return NextResponse.json(
            { error: 'Failed to update template sets' },
            { status: 500 }
        );
    }
}
