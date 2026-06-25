import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAuth } from '@/lib/auth';
import { fetchWithFallback } from '@/lib/openrouter';

export async function POST(req: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    // Fetch Latest News, prioritizing telegram and substack, then general news
    const { data: news } = await supabaseAdmin
      .from('news_articles')
      .select('title, content, source_platform, author_name, tickers_mentioned')
      .order('posted_at', { ascending: false })
      .limit(30);

    let contextString = `Recent News & Alpha Feed Context:\n\n`;

    if (news && news.length > 0) {
      news.forEach(n => {
        const tickers = n.tickers_mentioned ? `[Tickers: ${n.tickers_mentioned.join(', ')}] ` : '';
        contextString += `- [${n.source_platform.toUpperCase()}] ${tickers}${n.title ? n.title + ': ' : ''}${n.content.substring(0, 400)}...\n`;
      });
      contextString += "\n";
    }

    if (!news?.length) {
      contextString += "No recent news found in the database. Rely on your general macro knowledge.";
    }

    const systemPrompt = `You are an elite hedge fund analyst. The user has clicked a button asking "What's moving the market right now?"
Analyze the provided recent news feed (which contains Telegram alpha, Substack reports, and traditional news) and generate a short, punchy, and highly actionable paragraph explaining the primary drivers of market action right now. 
Focus on specific tickers, macro events, or narratives mentioned in the feed. Do NOT use conversational filler like "Here is the summary" or "Based on the provided text". Just write the summary. You may use markdown for bolding tickers.`;

    const openRouterMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${contextString}\n\nWhat is currently moving the market?` }
    ];

    const response = await fetchWithFallback(openRouterMessages, true);

    // Return the readable stream directly to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Market Summary API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

