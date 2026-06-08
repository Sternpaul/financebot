import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

export const revalidate = 60; // Revalidate feed every 60 seconds

export default async function Home() {
  // Fetch posts from supabase
  const { data: posts, error } = await supabase
    .from('fintwit_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  return (
    <main className="page-container animate-fade-in">
      <h1 className="header-title">Market <span className="text-gradient">Pulse</span></h1>
      
      <div className={styles.feedGrid}>
        {error && <p>Error loading feed: {error.message}</p>}
        {(!posts || posts.length === 0) && !error && (
          <div className="glass-panel">
            <p>No posts available yet. Check that your RSSHub worker is scraping feeds correctly.</p>
          </div>
        )}
        
        {posts?.map((post) => (
          <div key={post.id} className="glass-panel">
            <div className={styles.postHeader}>
              <strong>{post.author || 'Unknown'}</strong>
              <span className={styles.sentiment} data-score={post.sentiment_score}>
                Score: {post.sentiment_score?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <p className={styles.content}>{post.content}</p>
            <div className={styles.footer}>
              {post.url && (
                <a href={post.url} target="_blank" rel="noopener noreferrer">View Original</a>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
