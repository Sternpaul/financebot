"use client";

import { useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import styles from '../app/page.module.css';

function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

function getBadgeClass(platform: string) {
  if (platform === 'telegram') return styles.badgeTelegram;
  if (platform === 'substack') return styles.badgeSubstack;
  return styles.badgeYfinance;
}

function getPlatformName(platform: string) {
  if (platform === 'yfinance') return 'News';
  return platform;
}

export default function FeedViewer({ posts }: { posts: any[] }) {
  const [layout, setLayout] = useState<'grid' | 'list'>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const news = posts.filter(p => p.source_platform === 'yfinance').slice(0, 20);
  const reports = posts.filter(p => p.source_platform === 'substack').slice(0, 10);
  const telegram = posts.filter(p => p.source_platform === 'telegram').slice(0, 30);

  return (
    <div>
      <div className={styles.viewToggle}>
        <button 
          className={`${styles.toggleBtn} ${layout === 'list' ? styles.active : ''}`}
          onClick={() => setLayout('list')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          List View
        </button>
        <button 
          className={`${styles.toggleBtn} ${layout === 'grid' ? styles.active : ''}`}
          onClick={() => setLayout('grid')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          Grid View
        </button>
      </div>

      {layout === 'grid' ? (
        <div className={styles.yahooGrid}>
          {/* LEFT COLUMN: Traditional News */}
          <div className={styles.column}>
            <div className={styles.columnHeader}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              Latest News
            </div>
            <div className="glass-panel" style={{ padding: '15px' }}>
              {news.length === 0 && <p style={{color: 'var(--text-secondary)'}}>No news yet.</p>}
              {news.map((post) => (
                <div key={post.id} className={styles.newsArticle}>
                  <div className={styles.postHeader}>
                    <span style={{color: 'var(--text-secondary)', fontSize: '0.8rem'}}>
                      {post.tickers_mentioned?.join(', ') || 'Market'} • {post.author_name}
                    </span>
                  </div>
                  <a href={post.url} target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none'}}>
                    <div className={styles.title}>{post.title}</div>
                  </a>
                  <div className={styles.footer} style={{ marginTop: '5px' }}>
                    <span>{getRelativeTime(post.posted_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER COLUMN: Reports (Substack) */}
          <div className={styles.column}>
            <div className={styles.columnHeader}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              Deep Dives & Reports
            </div>
            {reports.length === 0 && <p style={{color: 'var(--text-secondary)'}}>No reports yet.</p>}
            {reports.map((post) => (
              <div key={post.id} className={styles.reportCard}>
                <div className={styles.postHeader}>
                  <span className={styles.authorName}>{post.source_handle}</span>
                  <span>{getRelativeTime(post.posted_at)}</span>
                </div>
                <a href={post.url} target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none'}}>
                  <div className={styles.title} style={{fontSize: '1.25rem'}}>{post.title}</div>
                </a>
                <div className={styles.content} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(post.content)}} />
              </div>
            ))}
          </div>

          {/* RIGHT COLUMN: Telegram / Alpha */}
          <div className={styles.column}>
            <div className={styles.columnHeader}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
              Alpha Feed
            </div>
            <div className="glass-panel" style={{padding: '15px'}}>
              {telegram.length === 0 && <p style={{color: 'var(--text-secondary)'}}>No alpha channels configured.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {telegram.map((post) => (
                  <div key={post.id} className={styles.telegramMessage}>
                    <div className={styles.postHeader} style={{marginBottom: '2px'}}>
                      <strong style={{color: '#24A1DE'}}>@{post.source_handle}</strong>
                      <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                        {getRelativeTime(post.posted_at)}
                      </span>
                    </div>
                    <div className={styles.telegramContent} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(post.content)}} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.feedList}>
          {posts.map((post) => {
            const isExpanded = expandedId === post.id.toString();
            const showExpandToggle = post.source_platform !== 'yfinance';
            
            return (
              <div key={post.id} className={styles.feedRow}>
                <div className={styles.rowHeader}>
                  <span style={{ color: 'var(--text-secondary)' }}>{getRelativeTime(post.posted_at)}</span>
                  <span className={`${styles.sourceBadge} ${getBadgeClass(post.source_platform)}`}>
                    {getPlatformName(post.source_platform)}
                  </span>
                  <strong style={{ color: 'var(--text-secondary)' }}>{post.author_name}</strong>
                  {post.tickers_mentioned && post.tickers_mentioned.map((t: string) => (
                    <span key={t} className={styles.tickerPill}>${t}</span>
                  ))}
                </div>
                
                {post.title && (
                  <a href={post.url} target="_blank" rel="noopener noreferrer" className={styles.rowTitle}>
                    {post.title}
                  </a>
                )}
                
                <div 
                  className={styles.rowContent} 
                  style={{
                    maxHeight: isExpanded ? 'none' : (post.source_platform === 'yfinance' ? 'none' : '100px'),
                    overflow: 'hidden',
                    cursor: showExpandToggle ? 'pointer' : 'default'
                  }}
                  onClick={() => showExpandToggle && setExpandedId(isExpanded ? null : post.id.toString())}
                  dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(post.content)}}
                />
                
                {showExpandToggle && !isExpanded && (
                  <div 
                    style={{ color: 'var(--accent)', fontSize: '0.85rem', cursor: 'pointer', marginTop: '5px' }}
                    onClick={() => setExpandedId(post.id.toString())}
                  >
                    Click to expand full printout...
                  </div>
                )}
                {showExpandToggle && isExpanded && (
                  <div 
                    style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', marginTop: '5px' }}
                    onClick={() => setExpandedId(null)}
                  >
                    Collapse
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
