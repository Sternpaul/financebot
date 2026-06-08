import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // If the user is trying to access the login page, let them pass
  if (request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // Check for our custom auth cookie
  const authCookie = request.cookies.get('financebot_auth');

  if (!authCookie || authCookie.value !== 'authenticated') {
    // Redirect to the login page if the cookie is missing or invalid
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Protect all routes except API routes, static files, Next.js internals, and images
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|pwa_icon.png|icon-).*)'],
};
