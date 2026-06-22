import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const getSecretKey = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is missing. It is required for signing JWTs.');
  }
  return new TextEncoder().encode(secret);
};

export async function middleware(request: NextRequest) {
  // If the user is trying to access the login page or health check, let them pass
  if (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname === '/api/health') {
    return NextResponse.next();
  }

  // Check for our custom auth cookie
  const authCookie = request.cookies.get('financebot_auth');

  if (!authCookie) {
    // Redirect to the login page if the cookie is missing
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Cryptographically verify the JWT signature using the master password
    await jwtVerify(authCookie.value, getSecretKey());
    return NextResponse.next();
  } catch (error) {
    // If the signature fails or the token is expired, delete the bad cookie and kick them out
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('financebot_auth');
    return response;
  }
}

export const config = {
  // Protect all routes except static files, Next.js internals, and images
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|pwa_icon.png|icon-).*)'],
};
