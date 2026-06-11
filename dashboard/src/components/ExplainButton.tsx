"use client";

import { useAppContext } from "./AppContext";

export default function ExplainButton({ ticker }: { ticker: string }) {
  const { setChatTrigger } = useAppContext();

  return (
    <button 
      onClick={() => setChatTrigger(`Explain today's move for ${ticker}`)}
      style={{
        padding: '6px 12px',
        fontSize: '0.85rem',
        background: 'var(--accent-primary)',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      Explain Today's Move
    </button>
  );
}
