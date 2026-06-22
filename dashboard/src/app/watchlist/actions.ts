'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

export async function searchTickers(query: string) {
  if (!query) return [];
  
  try {
    const encodedQuery = encodeURIComponent(query);
    const res = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodedQuery}&quotesCount=6`);
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
  const { error } = await supabaseAdmin.from('watchlist').insert([{
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
  await supabaseAdmin.from('watchlist').delete().eq('id', id);
  revalidatePath('/watchlist');
}

export async function updateCustomAlerts(ticker: string, customAlerts: any) {
  if (!Array.isArray(customAlerts)) {
    return { success: false, error: 'Custom alerts must be an array' };
  }
  
  if (customAlerts.length > 20) {
    return { success: false, error: 'Maximum 20 custom alerts allowed' };
  }
  
  const validatedAlerts = [];
  for (const alert of customAlerts) {
    if (typeof alert !== 'object' || alert === null) continue;
    if (typeof alert.name !== 'string' || !alert.name) continue;
    if (typeof alert.condition !== 'string' || !['above', 'below'].includes(alert.condition)) continue;
    if (typeof alert.target_price !== 'number' || alert.target_price < 0) continue;
    
    validatedAlerts.push({
      name: alert.name.substring(0, 50),
      condition: alert.condition,
      target_price: alert.target_price
    });
  }

  const { error } = await supabaseAdmin
    .from('watchlist')
    .update({ custom_alerts: validatedAlerts })
    .eq('ticker', ticker.toUpperCase());
    
  if (error) {
    console.error("Error updating custom alerts", error);
    return { success: false, error: error.message };
  }
  
  revalidatePath(`/watchlist/${ticker}`);
  return { success: true };
}
