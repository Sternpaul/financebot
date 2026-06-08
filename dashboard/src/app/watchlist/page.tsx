import { supabase } from '@/lib/supabase';
import WatchlistManager from '@/components/WatchlistManager';

export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  const { data: watchlist } = await supabase
    .from('watchlist')
    .select('*')
    .order('ticker', { ascending: true });

  return (
    <main className="page-container animate-fade-in">
      <h1 className="header-title">My <span className="text-gradient">Watchlist</span></h1>
      <WatchlistManager initialWatchlist={watchlist || []} />
    </main>
  );
}
