import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 });
    }

    // Fetch context from Supabase to augment the prompt
    // 1. Get portfolio
    const { data: txs } = await supabase.from('transactions').select('ticker, shares').not('ticker', 'is', null);
    
    let portfolioString = 'No active portfolio.';
    if (txs && txs.length > 0) {
      const holdings: Record<string, number> = {};
      for (const tx of txs) {
        if (!holdings[tx.ticker]) holdings[tx.ticker] = 0;
        holdings[tx.ticker] += tx.shares;
      }
      const activeHoldings = Object.entries(holdings).filter(([t, s]) => s > 0).map(([t, s]) => t);
      if (activeHoldings.length > 0) {
        portfolioString = activeHoldings.join(', ');
      }
    }

    // 2. Get recent market knowledge
    // We fetch the latest 10 rows
    const { data: knowledge } = await supabase
      .from('market_knowledge')
      .select('ticker, content')
      .order('created_at', { ascending: false })
      .limit(10);
      
    let knowledgeString = '';
    if (knowledge && knowledge.length > 0) {
      knowledgeString = knowledge.map(k => `[${k.ticker || 'MACRO'}]: ${k.content}`).join('\n');
    }

    const systemPrompt = `You are a professional financial AI assistant working for the user. 
    
User's Current Portfolio Holdings:
${portfolioString}

Recent Market Knowledge & News:
${knowledgeString ? knowledgeString : 'No recent news.'}

Use the provided market knowledge to answer the user's questions accurately. If they ask about their portfolio, refer to their holdings. Be concise and professional.`;

    const openRouterMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.LLM_MODEL || 'nex-agi/nex-n2-pro:free';

    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured.' }, { status: 500 });
    }

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
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenRouter Error:', err);
      return NextResponse.json({ error: 'Failed to communicate with AI provider.' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ 
      role: 'assistant', 
      content: data.choices[0].message.content 
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
