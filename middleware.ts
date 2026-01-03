import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'charlee-auth';

// Paths that don't require authentication
const publicPaths = ['/login', '/api/auth'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if path is public
    const isPublicPath = publicPaths.some(path =>
        pathname === path || pathname.startsWith(path + '/')
    );

    if (isPublicPath) {
        return NextResponse.next();
    }

    // Check for auth cookie
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME);

    if (!authCookie || authCookie.value !== 'authenticated') {
        // Redirect to login
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public folder)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)',
    ],
};
