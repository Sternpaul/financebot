import { supabase } from '@/lib/supabase';
import FeedViewer from '@/components/FeedViewer';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch latest per platform to ensure slower platforms (like Substack) still appear
  const [newsRes, tgRes, substackRes] = await Promise.all([
    supabase.from('news_articles').select('*').eq('source_platform', 'yfinance').order('posted_at', { ascending: false }).limit(30),
    supabase.from('news_articles').select('*').eq('source_platform', 'telegram').order('posted_at', { ascending: false }).limit(40),
    supabase.from('news_articles').select('*').eq('source_platform', 'substack').order('posted_at', { ascending: false }).limit(10)
  ]);

  const error = newsRes.error || tgRes.error || substackRes.error;

  const posts = [
    ...(newsRes.data || []),
    ...(tgRes.data || []),
    ...(substackRes.data || [])
  ].sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());

  return (
    <main className="page-container animate-fade-in">
      <h1 className="header-title">Market <span className="text-gradient">Pulse</span></h1>
      
      {error && <p>Error loading feed: {error.message}</p>}
      {posts.length === 0 && !error && (
        <div className="glass-panel">
          <p>No posts available yet. Make sure your worker has scraped the feeds.</p>
        </div>
      )}

      {posts.length > 0 && <FeedViewer posts={posts} />}
    </main>
  );
}
