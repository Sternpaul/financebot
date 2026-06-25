'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

export async function fetchSourcesData() {
  const { data: sourcesData } = await supabaseAdmin.from("content_sources").select("*").order("id", { ascending: true });
  const { data: watchlistData } = await supabaseAdmin.from("watchlist").select("*").order("id", { ascending: true });
  
  return { sourcesData, watchlistData };
}

export async function toggleSource(id: any, currentStatus: boolean, isWatchlist: boolean, dbId?: number) {
  if (isWatchlist && dbId) {
     await supabaseAdmin.from("watchlist").update({ alert_news: !currentStatus }).eq("id", dbId);
  } else {
     await supabaseAdmin.from("content_sources").update({ is_active: !currentStatus }).eq("id", id);
  }
}

export async function toggleRegion(regionSources: any[], targetStatus: boolean) {
  for (const source of regionSources) {
    if (source.is_active !== targetStatus) {
      await supabaseAdmin.from("content_sources").update({ is_active: targetStatus }).eq("id", source.id);
    }
  }
}

export async function addSource(newPlatform: string, newHandle: string) {
  if (!newHandle) return;
  
  if (newPlatform === 'yfinance') {
      const { data } = await supabaseAdmin.from("watchlist").select("*").eq("ticker", newHandle.toUpperCase()).single();
      if (data) {
          await supabaseAdmin.from("watchlist").update({ alert_news: true }).eq("id", data.id);
      } else {
          await supabaseAdmin.from("watchlist").insert([{ ticker: newHandle.toUpperCase(), alert_price: true, alert_news: true }]);
      }
  } else if (newPlatform === 'youtube_podcast') {
      let finalHandle = newHandle;
      let displayName = newHandle;
      
      // Smart Handle Resolution
      if (newHandle.startsWith('@')) {
          try {
              const res = await fetch(`https://www.youtube.com/${newHandle}`);
              const html = await res.text();
              const match = html.match(/"externalId":"(UC[a-zA-Z0-9_-]+)"/) || 
                            html.match(/"channelId":"(UC[a-zA-Z0-9_-]+)"/) ||
                            html.match(/<meta itemprop="identifier" content="(UC[a-zA-Z0-9_-]+)"/);
              if (match && match[1]) {
                  finalHandle = match[1];
              }
          } catch (e) {
              console.error("Failed to resolve YouTube handle", e);
          }
      }
      
      await supabaseAdmin.from("content_sources").insert([{ 
          platform: newPlatform, 
          handle: finalHandle, 
          display_name: displayName,
          is_active: true, 
          is_core: false 
      }]);
  } else {
      await supabaseAdmin.from("content_sources").insert([{ platform: newPlatform, handle: newHandle, is_active: true, is_core: false }]);
  }
}

export async function deleteSource(id: any, isWatchlist: boolean, dbId?: number) {
  if (isWatchlist && dbId) {
      await supabaseAdmin.from("watchlist").update({ alert_news: false }).eq("id", dbId);
  } else {
      await supabaseAdmin.from("content_sources").delete().eq("id", id);
  }
}
