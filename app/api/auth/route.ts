import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Trim the env var in case it has trailing newlines
const APP_PASSWORD = (process.env.APP_PASSWORD || 'charleegirl2026').trim();
const AUTH_COOKIE_NAME = 'charlee-auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { password } = body;
        const trimmedPassword = (password || '').trim();

        if (trimmedPassword === APP_PASSWORD) {
            // Set auth cookie
            const cookieStore = await cookies();
            cookieStore.set(AUTH_COOKIE_NAME, 'authenticated', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: '/',
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }
}

export async function DELETE() {
    try {
        const cookieStore = await cookies();
        cookieStore.delete(AUTH_COOKIE_NAME);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, error: 'Failed to logout' }, { status: 500 });
    }
}
