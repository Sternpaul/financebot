'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function addHolding(ticker: string, shares: number, avgCost: number) {
  const { error } = await supabase.from('holdings').insert([{
    ticker: ticker.toUpperCase(),
    shares,
    avg_cost: avgCost,
    account: 'main',
    currency: 'USD'
  }]);
  
  if (error) {
    console.error("Error adding holding", error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/portfolio');
  return { success: true };
}
