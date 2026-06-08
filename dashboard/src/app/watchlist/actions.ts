'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

export async function searchTickers(query: string) {
  if (!query || !FINNHUB_KEY) return [];
  
  try {
    const res = await fetch(`https://finnhub.io/api/v1/search?q=${query}&token=${FINNHUB_KEY}`);
    const data = await res.json();
    return data.result || [];
  } catch (error) {
    console.error("Finnhub search error", error);
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
