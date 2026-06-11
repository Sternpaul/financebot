import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { ticker } = await req.json();

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    // 1. Fetch Market Knowledge for Ticker
    const { data: knowledge } = await supabase
      .from('market_knowledge')
      .select('knowledge_type, content')
      .eq('ticker', ticker)
      .order('created_at', { ascending: false })
      .limit(5);

    // 2. Fetch Latest News for Ticker
    const { data: news } = await supabase
      .from('news_articles')
      .select('title, content, source_platform')
      .or(`source_handle.eq.${ticker},tickers_mentioned.cs.{${ticker}}`)
      .order('posted_at', { ascending: false })
      .limit(5);

    let contextString = `Context for ${ticker}:\n\n`;
    
    if (knowledge && knowledge.length > 0) {
      contextString += "Market Knowledge / Catalysts:\n";
      knowledge.forEach(k => contextString += `- [${k.knowledge_type}]: ${k.content}\n`);
      contextString += "\n";
    }

    if (news && news.length > 0) {
      contextString += "Latest News Mentions:\n";
      news.forEach(n => contextString += `- [${n.source_platform}] ${n.title}: ${n.content.substring(0, 300)}...\n`);
      contextString += "\n";
    }

    if (!knowledge?.length && !news?.length) {
       contextString += "No recent specific intelligence found in the database. You may use your general knowledge, but state that the bot hasn't ingested recent news for it.";
    }

    const systemPrompt = `You are a professional financial AI analyst. The user is asking to explain today's price movement or recent catalyst for the ticker ${ticker}. 
Analyze the provided recent context (which contains ingested news, fintwit, and derived market knowledge) and summarize the core reasons behind the move. 
Be concise, analytical, and professional. Do not use filler phrases like "based on the context provided". Just deliver the explanation.`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.LLM_MODEL || 'nex-agi/nex-n2-pro:free';

    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured.' }, { status: 500 });
    }

    const openRouterMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${contextString}\n\nExplain today's move for ${ticker}.` }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://financebot.local',
        'X-Title': 'FinanceBot Dashboard',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: openRouterMessages,
        stream: true // Enable streaming
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenRouter Error:', err);
      return NextResponse.json({ error: 'Failed to communicate with AI provider.' }, { status: 500 });
    }

    // Return the readable stream directly to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Explain API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
