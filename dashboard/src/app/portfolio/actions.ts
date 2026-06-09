'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function addHolding(ticker: string, shares: number, avgCost: number) {
  const symbol = ticker.toUpperCase();

  // Check if position already exists
  const { data: existing } = await supabase
    .from('holdings')
    .select('*')
    .eq('ticker', symbol)
    .eq('account', 'main')
    .single();

  if (existing) {
    // Recalculate blended average cost and aggregate shares
    const oldShares = existing.shares;
    const oldCost = existing.avg_cost;
    const newTotalShares = oldShares + shares;
    const newAvgCost = ((oldShares * oldCost) + (shares * avgCost)) / newTotalShares;

    const { error } = await supabase
      .from('holdings')
      .update({ shares: newTotalShares, avg_cost: newAvgCost })
      .eq('id', existing.id);

    if (error) {
      console.error("Error updating existing holding", error);
      return { success: false, error: error.message };
    }
  } else {
    // Insert new position
    const { error } = await supabase.from('holdings').insert([{
      ticker: symbol,
      shares,
      avg_cost: avgCost,
      account: 'main',
      currency: 'USD'
    }]);
    
    if (error) {
      console.error("Error adding holding", error);
      return { success: false, error: error.message };
    }
  }
  
  revalidatePath('/portfolio');
  return { success: true };
}

export async function searchTickers(query: string) {
  try {
    const res = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=5&newsCount=0`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.quotes || [];
  } catch (e) {
    console.error("Failed to search tickers", e);
    return [];
  }
}

export async function getHistoricalPrice(ticker: string, dateStr: string) {
  try {
    const date = new Date(dateStr);
    const startTs = Math.floor(date.getTime() / 1000);
    const endTs = startTs + 86400 * 5; // Look up to 5 days ahead in case it's a weekend/holiday
    
    // Convert popular crypto tickers to Yahoo Finance format
    let querySym = ticker.toUpperCase();
    if (['BTC', 'ETH', 'SOL', 'DOGE'].includes(querySym)) {
      querySym = `${querySym}-USD`;
    }

    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${querySym}?period1=${startTs}&period2=${endTs}&interval=1d`, { next: { revalidate: 3600 } });
    const data = await res.json();
    
    const closePrices = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (closePrices && closePrices.length > 0) {
      // Find the first valid price (in case of holidays/weekends, we expanded the range)
      const price = closePrices.find((p: number | null) => p !== null);
      if (price) return price;
    }
  } catch (e) {
    console.error("Failed to fetch historical price", e);
  }
  return null;
}

export async function updateHolding(id: number, shares: number, avgCost: number) {
  const { error } = await supabase
    .from('holdings')
    .update({ shares, avg_cost: avgCost })
    .eq('id', id);

  if (error) {
    console.error("Error updating holding", error);
    return { success: false, error: error.message };
  }
  revalidatePath('/portfolio');
  return { success: true };
}

export async function deleteHolding(id: number) {
  const { error } = await supabase
    .from('holdings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting holding", error);
    return { success: false, error: error.message };
  }
  revalidatePath('/portfolio');
  return { success: true };
}
