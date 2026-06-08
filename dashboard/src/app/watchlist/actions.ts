'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function searchTickers(query: string) {
  if (!query) return [];
  
  try {
    const res = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${query}&quotesCount=6`);
    const data = await res.json();
    return data.quotes.map((q: any) => ({
      symbol: q.symbol,
      description: q.shortname || q.longname || q.symbol,
      type: q.quoteType
    }));
  } catch (error) {
    console.error("Yahoo search error", error);
    return [];
  }
}

export async function addToWatchlist(ticker: string, name: string, type: string) {
  const { error } = await supabase.from('watchlist').insert([{
    ticker: ticker.toUpperCase(),
    name,
    asset_type: type || 'Stock',
    alert_news: true,
    alert_price_change: 5.0
  }]);
  
  if (error) {
    console.error("Error adding to watchlist", error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/watchlist');
  return { success: true };
}

export async function removeFromWatchlist(id: number) {
  await supabase.from('watchlist').delete().eq('id', id);
  revalidatePath('/watchlist');
}
