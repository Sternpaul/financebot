"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "../app/page.module.css";
import IngestionLogs from "./IngestionLogs";

interface ContentSource {
  id: number | string;
  platform: string;
  handle: string;
  is_active: boolean;
  is_core: boolean;
  region?: string | null;
  display_name?: string | null;
  db_id?: number;
}


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
        id: `watchlist_${w.id}`, 
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

  const handleRegionToggle = async (regionSources: ContentSource[], targetStatus: boolean) => {
    for (const source of regionSources) {
      if (source.is_active !== targetStatus) {
        await supabase.from("content_sources").update({ is_active: targetStatus }).eq("id", source.id);
      }
    }
    fetchSources();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHandle) return;
    
    if (newPlatform === 'yfinance') {
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
        await supabase.from("watchlist").update({ alert_news: false }).eq("id", dbId);
    } else {
        await supabase.from("content_sources").delete().eq("id", id);
    }
    fetchSources();
  };

  const renderToggle = (isActive: boolean, onChange: () => void) => (
    <label className={styles.switch}>
      <input type="checkbox" checked={isActive} onChange={onChange} />
      <span className={styles.slider}></span>
    </label>
  );

  // Grouping
  const regionalSources = sources.filter(s => s.region);
  const otherSources = sources.filter(s => !s.region);
  
  // Get unique regions dynamically
  const regions = Array.from(new Set(regionalSources.map(s => s.region as string)));

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
      <h2 style={{ marginBottom: '1rem', color: 'var(--foreground)' }}>Dynamic Sources Manager</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Add new Telegram channels or Substack newsletters. Manage global macro tracking below.
      </p>
      
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <select 
          value={newPlatform} 
          onChange={(e) => setNewPlatform(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', background: 'var(--background)', color: 'var(--foreground)', border: '1px solid #333' }}
        >
          <option value="telegram">Telegram</option>
          <option value="substack">Substack</option>
          <option value="yfinance">Specific Ticker</option>
        </select>
        <input 
          type="text" 
          placeholder="Handle / Domain / Ticker" 
          value={newHandle}
          onChange={(e) => setNewHandle(e.target.value)}
          style={{ flex: 1, padding: '8px', borderRadius: '4px', background: 'var(--background)', color: 'var(--foreground)', border: '1px solid #333' }}
        />
        <button type="submit" style={{ padding: '8px 16px', borderRadius: '4px', background: '#333', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          Add Source
        </button>
      </form>

      {/* REGIONAL MACRO NEWS */}
      <h3 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>General Market News</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
        {regions.map(region => {
          const sourcesInRegion = regionalSources.filter(s => s.region === region);
          if (sourcesInRegion.length === 0) return null;
          
          const allActive = sourcesInRegion.every(s => s.is_active);
          const someActive = sourcesInRegion.some(s => s.is_active);

          return (
            <div key={region} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #333', paddingBottom: '12px' }}>
                <strong style={{ fontSize: '1.1rem', color: 'var(--foreground)' }}>{region} Region</strong>
                {renderToggle(allActive, () => handleRegionToggle(sourcesInRegion, !allActive))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {sourcesInRegion.map(source => (
                  <div key={source.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{source.display_name || source.handle} <span style={{fontSize: '0.75rem', opacity: 0.5}}>({source.handle})</span></span>
                    {renderToggle(source.is_active, () => handleToggle(source.id, source.is_active, false))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* SPECIFIC SOURCES & ALERTS */}
      <h3 style={{ marginBottom: '1rem', color: 'var(--foreground)' }}>Alpha Feeds & Watchlist News</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {otherSources.map((source: any) => {
          const isWatchlist = source.id.toString().startsWith('watchlist_');
          return (
          <div key={source.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
            <div>
              <span style={{ fontWeight: 'bold', marginRight: '10px', color: 'var(--foreground)' }}>{source.handle}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--background)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #333' }}>
                {source.platform === 'yfinance' ? 'Watchlist News' : source.platform}
              </span>
              {source.is_core && <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#ffcc00' }}>⭐ Core</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {renderToggle(source.is_active, () => handleToggle(source.id, source.is_active, isWatchlist, source.db_id))}
              {!source.is_core && (
                <button 
                  onClick={() => handleDelete(source.id, isWatchlist, source.db_id)}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ff3366', background: 'transparent', color: '#ff3366', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )})}
        {otherSources.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No specific sources configured yet.</p>}
      </div>
      
      <IngestionLogs />
    </div>
  );
}
