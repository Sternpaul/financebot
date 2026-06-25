"use client";

import { useState } from "react";
import { fetchTranscript } from "@/app/actions/podcasts";

export default function PodcastClient({ initialEpisodes }: { initialEpisodes: any[] }) {
  const [activeTranscript, setActiveTranscript] = useState<{title: string, text: string} | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState<string | null>(null);
  const [expandedVideos, setExpandedVideos] = useState<Set<string>>(new Set());

  const handleViewTranscript = async (videoId: string, title: string) => {
    setLoadingTranscript(videoId);
    try {
      const text = await fetchTranscript(videoId);
      setActiveTranscript({ title, text: text || "No transcript available for this episode." });
    } catch (e) {
      console.error(e);
      setActiveTranscript({ title, text: "Error loading transcript." });
    }
    setLoadingTranscript(null);
  };

  const toggleVideo = (videoId: string) => {
    const next = new Set(expandedVideos);
    if (next.has(videoId)) next.delete(videoId);
    else next.add(videoId);
    setExpandedVideos(next);
  };

  return (
    <div style={{ display: 'flex', gap: '32px' }}>
      {/* Main Content Column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {initialEpisodes.map((episode) => {
          const dateStr = new Date(episode.published_at).toLocaleDateString(undefined, { 
            month: 'short', day: 'numeric', year: 'numeric' 
          });
          const daysAgo = Math.floor((Date.now() - new Date(episode.published_at).getTime()) / (1000 * 60 * 60 * 24));
          const isVideoExpanded = expandedVideos.has(episode.video_id);
          
          return (
            <div key={episode.id} className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', 
                    background: 'linear-gradient(135deg, var(--bg-modifier-hover), var(--bg-modifier-active))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)'
                  }}>
                    {episode.show_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                      @{episode.show_name.replace(/\s+/g, '')}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: '#ff0000' }}>▶</span>
                      {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`} • {dateStr}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => handleViewTranscript(episode.video_id, episode.title)}
                    style={{
                      padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-modifier-hover)', color: 'var(--text-secondary)',
                      border: '1px solid var(--glass-border)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold'
                    }}
                  >
                    {loadingTranscript === episode.video_id ? 'Loading...' : 'Transcript'}
                  </button>
                  <button 
                    onClick={() => toggleVideo(episode.video_id)}
                    style={{
                      padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-modifier-hover)', color: 'var(--text-secondary)',
                      border: '1px solid var(--glass-border)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold'
                    }}
                  >
                    {isVideoExpanded ? 'Hide Video' : 'Watch'}
                  </button>
                  <a href={`https://youtube.com/watch?v=${episode.video_id}`} target="_blank" rel="noopener noreferrer" style={{
                    padding: '8px', borderRadius: '8px', background: 'var(--bg-modifier-hover)', color: 'var(--text-secondary)',
                    textDecoration: 'none', border: '1px solid var(--glass-border)'
                  }}>
                    ↗
                  </a>
                </div>
              </div>

              <h2 style={{ fontSize: '1.3rem', fontWeight: '500', marginBottom: '20px', color: 'var(--text-primary)' }}>
                {episode.title}
              </h2>

              {/* Collapsible Video Embed */}
              {isVideoExpanded && (
                <div style={{ marginBottom: '20px', borderRadius: '12px', overflow: 'hidden' }}>
                  <iframe 
                    width="100%" 
                    height="400" 
                    src={`https://www.youtube.com/embed/${episode.video_id}`} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              <div style={{ fontSize: '0.85rem', fontWeight: '600', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                IDEAS · {episode.podcast_trades ? episode.podcast_trades.length : 0}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {!episode.podcast_trades || episode.podcast_trades.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No specific trades identified in this episode.</p>
                ) : (
                  episode.podcast_trades.map((trade: any) => {
                    const isLong = trade.trade_type === 'LONG';
                    const isShort = trade.trade_type === 'SHORT';
                    
                    return (
                      <div key={trade.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '12px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                        <div style={{ 
                          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                          background: 'var(--bg-modifier-hover)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: 'bold'
                        }}>
                          {trade.ticker.substring(0, 1)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>{trade.ticker}</span>
                            <span style={{
                              fontSize: '0.7rem', fontWeight: '600', padding: '2px 8px', borderRadius: '12px',
                              background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8'
                            }}>
                              ai extracted
                            </span>
                            <span style={{
                              fontSize: '0.8rem', fontWeight: '700',
                              color: isLong ? 'var(--trend-up)' : isShort ? 'var(--trend-down)' : 'var(--text-secondary)'
                            }}>
                              {trade.trade_type}
                            </span>
                          </div>
                          <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            {trade.thesis}
                          </p>
                          {trade.speaker && (
                            <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              — {trade.speaker}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transcript Sidebar Panel */}
      {activeTranscript && (
        <div style={{ 
          width: '400px', 
          flexShrink: 0, 
          background: 'var(--glass-bg)', 
          borderLeft: '1px solid var(--glass-border)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: '20px',
          height: 'calc(100vh - 40px)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--foreground)' }}>Full Transcript</h3>
            <button 
              onClick={() => setActiveTranscript(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ✕
            </button>
          </div>
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
            <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>{activeTranscript.title}</h4>
            <div style={{ 
              color: 'var(--text-primary)', 
              fontSize: '0.9rem', 
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}>
              {activeTranscript.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
