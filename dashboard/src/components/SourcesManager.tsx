"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ContentSource = {
  id: number;
  platform: string;
  handle: string;
  is_active: boolean;
  is_core: boolean;
};

export default function SourcesManager() {
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [newPlatform, setNewPlatform] = useState("telegram");
  const [newHandle, setNewHandle] = useState("");

  const fetchSources = async () => {
    const { data: sourcesData } = await supabase.from("content_sources").select("*").order("id", { ascending: true });
    const { data: watchlistData } = await supabase.from("watchlist").select("*").order("id", { ascending: true });
    
    let combined: ContentSource[] = [];
    if (sourcesData) combined = [...combined, ...sourcesData];
    
    if (watchlistData) {
      const watchlistSources = watchlistData.map((w: any) => ({
        id: `watchlist_${w.id}`, // prefix to avoid collisions
        platform: 'yfinance',
        handle: w.ticker,
        is_active: w.alert_news,
        is_core: false,
        db_id: w.id
      }));
      combined = [...combined, ...watchlistSources];
    }
    
    setSources(combined);
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleToggle = async (id: any, currentStatus: boolean, isWatchlist: boolean, dbId?: number) => {
    if (isWatchlist && dbId) {
       await supabase.from("watchlist").update({ alert_news: !currentStatus }).eq("id", dbId);
    } else {
       await supabase.from("content_sources").update({ is_active: !currentStatus }).eq("id", id);
    }
    fetchSources();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHandle) return;
    
    if (newPlatform === 'yfinance') {
        // Check if ticker already exists in watchlist
        const { data } = await supabase.from("watchlist").select("*").eq("ticker", newHandle.toUpperCase()).single();
        if (data) {
            await supabase.from("watchlist").update({ alert_news: true }).eq("id", data.id);
        } else {
            await supabase.from("watchlist").insert([{ ticker: newHandle.toUpperCase(), alert_price: true, alert_news: true }]);
        }
    } else {
        await supabase.from("content_sources").insert([{ platform: newPlatform, handle: newHandle, is_active: true, is_core: false }]);
    }
    
    setNewHandle("");
    fetchSources();
  };

  const handleDelete = async (id: any, isWatchlist: boolean, dbId?: number) => {
    if (isWatchlist && dbId) {
        // For watchlist, just disable news instead of deleting the whole ticker from watchlist
        await supabase.from("watchlist").update({ alert_news: false }).eq("id", dbId);
    } else {
        await supabase.from("content_sources").delete().eq("id", id);
    }
    fetchSources();
  };

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
      <h2 style={{ marginBottom: '1rem', color: 'var(--foreground)' }}>Dynamic Sources Manager</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Add new Telegram channels or Substack newsletters. The cloud engine will instantly begin tracking them.
      </p>
      
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <select 
          value={newPlatform} 
          onChange={(e) => setNewPlatform(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', background: 'var(--background)', color: 'var(--foreground)', border: '1px solid #333' }}
        >
          <option value="telegram">Telegram</option>
          <option value="substack">Substack</option>
          <option value="yfinance">Traditional News</option>
        </select>
        <input 
          type="text" 
          placeholder="Handle / Domain" 
          value={newHandle}
          onChange={(e) => setNewHandle(e.target.value)}
          style={{ flex: 1, padding: '8px', borderRadius: '4px', background: 'var(--background)', color: 'var(--foreground)', border: '1px solid #333' }}
        />
        <button type="submit" style={{ padding: '8px 16px', borderRadius: '4px', background: '#333', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          Add Source
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sources.map((source: any) => {
          const isWatchlist = source.id.toString().startsWith('watchlist_');
          return (
          <div key={source.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
            <div>
              <span style={{ fontWeight: 'bold', marginRight: '10px', color: 'var(--foreground)' }}>{source.handle}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--background)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #333' }}>{source.platform === 'yfinance' ? 'Traditional News' : source.platform}</span>
              {source.is_core && <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#ffcc00' }}>⭐ Core</span>}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => handleToggle(source.id, source.is_active, isWatchlist, source.db_id)}
                style={{ padding: '4px 12px', borderRadius: '4px', border: source.is_active ? 'none' : '1px solid #333', background: source.is_active ? 'var(--accent)' : 'transparent', color: source.is_active ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}
              >
                {source.is_active ? 'Active' : 'Paused'}
              </button>
              {!source.is_core && (
                <button 
                  onClick={() => handleDelete(source.id, isWatchlist, source.db_id)}
                  style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid #ff3366', background: 'transparent', color: '#ff3366', cursor: 'pointer' }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )})}
        {sources.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No sources configured yet. Check your database connection.</p>}
      </div>
    </div>
  );
}
