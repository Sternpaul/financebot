'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function fetchSourcesData() {
  const { data: sourcesData } = await supabase.from("content_sources").select("*").order("id", { ascending: true });
  const { data: watchlistData } = await supabase.from("watchlist").select("*").order("id", { ascending: true });
  
  return { sourcesData, watchlistData };
}

export async function toggleSource(id: any, currentStatus: boolean, isWatchlist: boolean, dbId?: number) {
  if (isWatchlist && dbId) {
     await supabase.from("watchlist").update({ alert_news: !currentStatus }).eq("id", dbId);
  } else {
     await supabase.from("content_sources").update({ is_active: !currentStatus }).eq("id", id);
  }
}

export async function toggleRegion(regionSources: any[], targetStatus: boolean) {
  for (const source of regionSources) {
    if (source.is_active !== targetStatus) {
      await supabase.from("content_sources").update({ is_active: targetStatus }).eq("id", source.id);
    }
  }
}

export async function addSource(newPlatform: string, newHandle: string) {
  if (!newHandle) return;
  
  if (newPlatform === 'yfinance') {
      const { data } = await supabase.from("watchlist").select("*").eq("ticker", newHandle.toUpperCase()).single();
      if (data) {
          await supabase.from("watchlist").update({ alert_news: true }).eq("id", data.id);
      } else {
          await supabase.from("watchlist").insert([{ ticker: newHandle.toUpperCase(), alert_price: true, alert_news: true }]);
      }
  } else {
      await supabase.from("content_sources").insert([{ platform: newPlatform, handle: newHandle, is_active: true, is_core: false }]);
  }
}

export async function deleteSource(id: any, isWatchlist: boolean, dbId?: number) {
  if (isWatchlist && dbId) {
      await supabase.from("watchlist").update({ alert_news: false }).eq("id", dbId);
  } else {
      await supabase.from("content_sources").delete().eq("id", id);
  }
}
