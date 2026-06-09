import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

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

export default async function Home() {
  // Fetch ALL posts
  const { data: allPosts, error } = await supabase
    .from('news_articles')
    .select('*')
    .order('posted_at', { ascending: false })
    .limit(100);

  const posts = allPosts || [];
  
  const news = posts.filter(p => p.source_platform === 'yfinance').slice(0, 20);
  const reports = posts.filter(p => p.source_platform === 'substack').slice(0, 10);
  const telegram = posts.filter(p => p.source_platform === 'telegram').slice(0, 30);

  return (
    <main className="page-container animate-fade-in">
      <h1 className="header-title">Market <span className="text-gradient">Pulse</span></h1>
      
      {error && <p>Error loading feed: {error.message}</p>}
      {posts.length === 0 && !error && (
        <div className="glass-panel">
          <p>No posts available yet. Make sure your worker has scraped the feeds.</p>
        </div>
      )}

      {posts.length > 0 && (
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
                <div className={styles.content} dangerouslySetInnerHTML={{__html: post.content}} />
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
                    <div className={styles.telegramContent} dangerouslySetInnerHTML={{__html: post.content}} />
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </main>
  );
}
