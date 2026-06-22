import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const getSecretKey = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is missing.');
  }
  return new TextEncoder().encode(secret);
};

export async function requireAuth() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('financebot_auth');

  if (!authCookie) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Missing auth cookie' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await jwtVerify(authCookie.value, getSecretKey());
    return null; // Auth successful
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
