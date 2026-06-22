'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

// Replaces `addHolding`. Now inserts a transaction.
export async function addTransaction(type: string, ticker: string | null, shares: number | null, price: number | null, dateStr: string) {
  const symbol = ticker ? ticker.toUpperCase() : null;

  const { error } = await supabaseAdmin.from('transactions').insert([{
    type,
    ticker: symbol,
    shares,
    price_per_share: price,
    date: dateStr,
    account: 'main',
    currency: 'USD'
  }]);
  
  if (error) {
    console.error("Error adding transaction", error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/portfolio');
  return { success: true };
}

// Bulk inserts transactions
export async function importTransactions(transactionsList: any[]) {
  if (!Array.isArray(transactionsList)) {
    return { success: false, error: 'Invalid input format. Expected an array.' };
  }
  
  if (transactionsList.length > 500) {
    return { success: false, error: 'Too many transactions to import at once. Maximum is 500.' };
  }

  const formatted = [];
  for (const t of transactionsList) {
    if (!t.type || typeof t.type !== 'string' || !['BUY', 'SELL', 'CASH_ADD', 'CASH_REMOVE', 'DIVIDEND'].includes(t.type)) {
      return { success: false, error: 'Invalid transaction type in list.' };
    }
    if (t.ticker && typeof t.ticker !== 'string') return { success: false, error: 'Invalid ticker format.' };
    if (t.shares !== undefined && t.shares !== null && typeof t.shares !== 'number') return { success: false, error: 'Invalid shares format.' };
    if (t.price_per_share !== undefined && t.price_per_share !== null && typeof t.price_per_share !== 'number') return { success: false, error: 'Invalid price format.' };
    
    formatted.push({
      type: t.type,
      ticker: t.ticker ? t.ticker.toUpperCase() : null,
      shares: t.shares || null,
      price_per_share: t.price_per_share || null,
      date: t.date || new Date().toISOString(),
      account: 'main',
      currency: 'USD'
    });
  }

  const { error } = await supabaseAdmin.from('transactions').insert(formatted);
  
  if (error) {
    console.error("Error bulk adding transactions", error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/portfolio');
  return { success: true };
}
export async function getHoldings() {
  const { data: transactions, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('account', 'main')
    .order('date', { ascending: true });

  if (error || !transactions) {
    console.error("Error fetching transactions", error);
    return [];
  }

  const holdingsMap = new Map<string, { shares: number, totalCost: number }>();
  let cashBalance = 0;

  for (const t of transactions) {
    if (t.type === 'CASH_ADD') {
      cashBalance += t.price_per_share || 0; // we can store amount in price_per_share
    } else if (t.type === 'CASH_REMOVE') {
      cashBalance -= t.price_per_share || 0;
    } else if (t.type === 'BUY' && t.ticker) {
      const current = holdingsMap.get(t.ticker) || { shares: 0, totalCost: 0 };
      current.shares += t.shares || 0;
      current.totalCost += (t.shares || 0) * (t.price_per_share || 0);
      holdingsMap.set(t.ticker, current);
      // Buying deducts cash if we assume cash was used, but the user explicitly said:
      // "I think it should be more like 'owned cash'... I just need to be able to 'add' cash... PNL will not change"
      // We will just track cash as a separate asset.
    } else if (t.type === 'SELL' && t.ticker) {
      const current = holdingsMap.get(t.ticker);
      if (current) {
        // Average cost basis reduction
        const avgCost = current.totalCost / current.shares;
        current.shares -= t.shares || 0;
        current.totalCost -= (t.shares || 0) * avgCost;
        if (current.shares <= 0) {
          holdingsMap.delete(t.ticker);
        } else {
          holdingsMap.set(t.ticker, current);
        }
      }
    }
  }

  const result = [];
  
  // Add cash as a pseudo-holding
  if (cashBalance > 0) {
    result.push({
      id: 'cash',
      ticker: 'USD',
      shares: cashBalance,
      avg_cost: 1, // Cash is always worth 1
      isCash: true
    });
  }

  // Add stocks
  for (const [ticker, data] of Array.from(holdingsMap.entries())) {
    result.push({
      id: ticker, // Temporary ID for React loop
      ticker,
      shares: data.shares,
      avg_cost: data.totalCost / data.shares,
      isCash: false
    });
  }

  return result;
}

export async function searchTickers(query: string) {
  if (!query) return [];
  
  try {
    const encodedQuery = encodeURIComponent(query);
    const res = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodedQuery}&quotesCount=6`);
    const data = await res.json();
    return data.quotes.map((q: any) => ({
      symbol: q.symbol,
      description: q.shortname || q.longname || q.symbol,
      quoteType: q.quoteType
    }));
  } catch (error) {
    console.error("Yahoo search error", error);
    return [];
  }
}

export async function getExchangeRate(pair: string = 'EURUSD=X') {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${pair}?interval=1d&range=1d`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data.chart.result[0].meta.regularMarketPrice;
    return rate;
  } catch (err) {
    console.error("Error fetching exchange rate:", err);
    return null;
  }
}

export async function getHistoricalPrice(ticker: string, dateStr: string) {
  try {
    const date = new Date(dateStr);
    const startTs = Math.floor(date.getTime() / 1000);
    const endTs = startTs + 86400 * 5; // Look up to 5 days ahead in case it's a weekend/holiday
    
    let querySym = ticker.toUpperCase();
    if (['BTC', 'ETH', 'SOL', 'DOGE'].includes(querySym)) {
      querySym = `${querySym}-USD`;
    }
    const encodedSym = encodeURIComponent(querySym);

    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodedSym}?period1=${startTs}&period2=${endTs}&interval=1d`, { next: { revalidate: 3600 } });
    const data = await res.json();
    
    const closePrices = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (closePrices && closePrices.length > 0) {
      const price = closePrices.find((p: number | null) => p !== null);
      if (price) return price;
    }
  } catch (e) {
    console.error("Failed to fetch historical price", e);
  }
  return null;
}

export async function deleteTransaction(id: number) {
  const { error } = await supabaseAdmin
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting transaction", error);
    return { success: false, error: error.message };
  }
  revalidatePath('/portfolio');
  return { success: true };
}
