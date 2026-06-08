"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { searchTickers, addToWatchlist, removeFromWatchlist } from "@/app/watchlist/actions";

export default function WatchlistManager({ initialWatchlist }: { initialWatchlist: any[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    const res = await searchTickers(query);
    setResults(res);
  };

  const handleAdd = (ticker: string, name: string, type: string) => {
    startTransition(async () => {
      await addToWatchlist(ticker, name, type);
      setResults([]);
      setQuery("");
    });
  };

  const handleRemove = (id: number) => {
    startTransition(async () => {
      await removeFromWatchlist(id);
    });
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="Search for Stocks, ETFs, Crypto... (e.g. AAPL, BTC)" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'var(--glass-bg)', color: 'var(--foreground)', border: '1px solid var(--glass-border)' }}
        />
        <button type="submit" style={{ padding: '12px 24px', borderRadius: '8px', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          Search
        </button>
      </form>

      {results.length > 0 && (
        <div style={{ marginBottom: '30px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px' }}>
          <h3 style={{ marginBottom: '10px', color: 'var(--text-secondary)' }}>Search Results</h3>
          {results.map(r => (
            <div key={r.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #333' }}>
              <div>
                <strong>{r.symbol}</strong> <span style={{ color: '#888' }}>{r.description}</span>
                <span style={{ marginLeft: '10px', fontSize: '0.8rem', background: '#222', padding: '2px 6px', borderRadius: '4px' }}>{r.type}</span>
              </div>
              <button 
                onClick={() => handleAdd(r.symbol, r.description, r.type)}
                style={{ background: 'transparent', border: '1px solid #4caf50', color: '#4caf50', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}
              >
                + Add
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {initialWatchlist.map(item => (
          <div key={item.id} style={{ padding: '20px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', position: 'relative' }}>
            <button 
              onClick={() => handleRemove(item.id)}
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: '#ff3366', cursor: 'pointer', fontSize: '1.2rem' }}
              title="Remove"
            >
              ×
            </button>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--foreground)' }}>{item.ticker}</h3>
            <p style={{ margin: '5px 0', color: 'var(--text-secondary)' }}>{item.name}</p>
            <span style={{ fontSize: '0.8rem', background: 'var(--background)', color: 'var(--foreground)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #333' }}>{item.asset_type}</span>
            <div style={{ marginTop: '15px' }}>
              <Link href={`/watchlist/${item.ticker}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 'bold' }}>
                View Dashboard →
              </Link>
            </div>
          </div>
        ))}
        {initialWatchlist.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Your watchlist is empty.</p>}
      </div>
    </div>
  );
}
