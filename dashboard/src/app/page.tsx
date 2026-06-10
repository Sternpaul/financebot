import { supabase } from '@/lib/supabase';
import FeedViewer from '@/components/FeedViewer';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch ALL posts
  const { data: allPosts, error } = await supabase
    .from('news_articles')
    .select('*')
    .order('posted_at', { ascending: false })
    .limit(100);

  const posts = allPosts || [];

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
