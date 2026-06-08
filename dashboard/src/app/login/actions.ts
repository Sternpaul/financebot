'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT } from 'jose';

// Helper to encode the secret key
const getSecretKey = () => {
  const secret = process.env.DASHBOARD_PASSWORD || 'fallback_secret_for_local_dev';
  return new TextEncoder().encode(secret);
};

export async function authenticate(prevState: any, formData: FormData) {
  const password = formData.get('password') as string;
  const correctPassword = process.env.DASHBOARD_PASSWORD;

  if (!correctPassword) {
    if (password === 'admin') {
       // local fallback
       const jwt = await new SignJWT({ authenticated: true })
         .setProtectedHeader({ alg: 'HS256' })
         .setIssuedAt()
         .setExpirationTime('30d')
         .sign(getSecretKey());
         
       const cookieStore = await cookies();
       cookieStore.set('financebot_auth', jwt, {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         maxAge: 60 * 60 * 24 * 30, // 30 days
         path: '/',
       });
       redirect('/');
    }
    return { error: 'DASHBOARD_PASSWORD is not set in Vercel Environment Variables.' };
  }

  if (password === correctPassword) {
    // Mint cryptographically secure JWT
    const jwt = await new SignJWT({ authenticated: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(getSecretKey());

    const cookieStore = await cookies();
    cookieStore.set('financebot_auth', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
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
