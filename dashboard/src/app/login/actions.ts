'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function authenticate(prevState: any, formData: FormData) {
  const password = formData.get('password') as string;
  const correctPassword = process.env.DASHBOARD_PASSWORD;

  if (!correctPassword) {
    if (password === 'admin') {
       const cookieStore = await cookies();
       cookieStore.set('financebot_auth', 'authenticated', {
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
    const cookieStore = await cookies();
    cookieStore.set('financebot_auth', 'authenticated', {
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
