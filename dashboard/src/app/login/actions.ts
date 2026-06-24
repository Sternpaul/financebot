'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT } from 'jose';

// Helper to encode the secret key
const getSecretKey = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not set. Required for signing JWTs.');
  }
  return new TextEncoder().encode(secret);
};

// Rate limiting: max 5 failed attempts per 15 minutes
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    // Window expired or first attempt — reset
    loginAttempts.set(key, { count: 1, firstAttempt: now });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS) {
    return false; // Rate limited
  }

  record.count++;
  return true;
}

function clearRateLimit(key: string) {
  loginAttempts.delete(key);
}

export async function authenticate(prevState: any, formData: FormData) {
  const headersList = await headers();
  const rateLimitKey = headersList.get('x-forwarded-for') || 'unknown';

  if (!checkRateLimit(rateLimitKey)) {
    return { error: 'Too many login attempts. Please wait 15 minutes before trying again.' };
  }

  const password = formData.get('password') as string;
  const correctPassword = process.env.DASHBOARD_PASSWORD;

  if (!correctPassword) {
    return { error: 'DASHBOARD_PASSWORD is not set in Vercel Environment Variables. Login is disabled.' };
  }

  if (password === correctPassword) {
    clearRateLimit(rateLimitKey);

    // Mint cryptographically secure JWT
    const jwt = await new SignJWT({ authenticated: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(getSecretKey());

    const cookieStore = await cookies();
    cookieStore.set('financebot_auth', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    
    redirect('/');
  } else {
    return { error: 'Incorrect password.' };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('financebot_auth');
  redirect('/login');
}

