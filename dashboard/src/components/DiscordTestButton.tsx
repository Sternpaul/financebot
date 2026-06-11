"use client";

import { useState } from 'react';

export default function DiscordTestButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleTest = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/discord/test', { method: 'POST' });
      if (res.ok) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <button 
      onClick={handleTest} 
      disabled={status === 'loading'}
      style={{
        background: status === 'success' ? 'var(--success)' : status === 'error' ? 'var(--danger)' : 'var(--bg-secondary)',
        color: status === 'success' || status === 'error' ? '#fff' : 'var(--text-primary)',
        border: '1px solid var(--glass-border)',
        padding: '10px 20px',
        borderRadius: '8px',
        cursor: status === 'loading' ? 'not-allowed' : 'pointer',
        fontWeight: 'bold',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease'
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      {status === 'idle' ? 'Test Discord Integration' :
       status === 'loading' ? 'Sending...' :
       status === 'success' ? 'Message Sent!' : 'Error! Check console'}
    </button>
  );
}
