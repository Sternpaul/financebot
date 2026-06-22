'use server';

import { cookies } from 'next/headers';
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

export async function authenticate(prevState: any, formData: FormData) {
  const password = formData.get('password') as string;
  const correctPassword = process.env.DASHBOARD_PASSWORD;

  if (!correctPassword) {
    return { error: 'DASHBOARD_PASSWORD is not set in Vercel Environment Variables. Login is disabled.' };
  }

  if (password === correctPassword) {
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
