"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAppContext } from './AppContext';
import { useMemo, useState, useEffect } from 'react';

export default function PortfolioCharts({ holdingsWithPrices }: { holdingsWithPrices: any[] }) {
  const { currency } = useAppContext();
  const isEur = currency === 'EUR';
  const symbol = isEur ? '€' : '$';
  const rate = isEur ? 0.92 : 1.0;

  const totalValue = holdingsWithPrices.reduce((sum, h) => sum + (h.shares * h.currentPrice), 0);
  const totalCost = holdingsWithPrices.reduce((sum, h) => sum + (h.shares * h.avg_cost), 0);
  const totalPnL = totalValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  const totalDailyPnL = holdingsWithPrices.reduce((sum, h) => sum + (h.shares * h.currentPrice * (h.pctChange / 100)), 0) * rate;
  const totalDailyPnLPct = totalValue > 0 ? (totalDailyPnL / (totalValue * rate)) * 100 : 0;

  const data = holdingsWithPrices.map(h => ({
    name: h.ticker,
    value: h.shares * h.currentPrice * rate
  })).sort((a, b) => b.value - a.value);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff3366', '#4caf50'];

  const gainers = [...holdingsWithPrices].sort((a, b) => b.pctChange - a.pctChange).slice(0, 3);
  const losers = [...holdingsWithPrices].sort((a, b) => a.pctChange - b.pctChange).slice(0, 3);

  // Real Historical Data
  const [timeRange, setTimeRange] = useState('1M');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      if (!holdingsWithPrices || holdingsWithPrices.length === 0) {
        return;
      }
      setIsFetching(true);
      
      const symbols = holdingsWithPrices.map(h => {
        const t = h.ticker.toUpperCase();
        return ['BTC', 'ETH', 'SOL', 'DOGE'].includes(t) ? `${t}-USD` : t;
      }).join(',');

      const rangeMap: Record<string, { range: string, interval: string }> = {
        '1D': { range: '1d', interval: '5m' },
        '1W': { range: '5d', interval: '15m' },
        '1M': { range: '1mo', interval: '1d' },
        '3M': { range: '3mo', interval: '1d' },
        'YTD': { range: 'ytd', interval: '1d' },
        '1Y': { range: '1y', interval: '1wk' },
        'ALL': { range: 'max', interval: '1mo' },
      };
      
      const { range, interval } = rangeMap[timeRange] || rangeMap['1M'];

      try {
        const res = await fetch(`/api/portfolio-history?symbols=${symbols}&range=${range}&interval=${interval}`);
        const data = await res.json();
        const sparks = data.spark?.result || [];

        // 1. Gather all unique timestamps to align irregular time-series
        const allTimestamps = new Set<number>();
        sparks.forEach((s: any) => {
           const timestamps = s.response[0]?.timestamp || [];
           timestamps.forEach((ts: number) => allTimestamps.add(ts));
        });
        const sortedTimes = Array.from(allTimestamps).sort((a, b) => a - b);

        // 2. Setup LOCF (Last Observation Carried Forward) state for each symbol
        const seriesData = sparks.map((s: any) => {
           const sym = s.symbol;
           const h = holdingsWithPrices.find(x => x.ticker.toUpperCase() === sym.replace('-USD', ''));
           const shares = h ? h.shares : 0;
           
           const timestamps = s.response[0]?.timestamp || [];
           const closes = s.response[0]?.indicators?.quote[0]?.close || [];
           
           const priceMap = new Map<number, number>();
           timestamps.forEach((ts: number, i: number) => {
              if (closes[i] !== null) priceMap.set(ts, closes[i]);
           });
           
           // Initialize with previous close to prevent artificial 0-value drops during pre-market
           let firstPrice = 0;
           if (s.response[0]?.meta?.previousClose) {
               firstPrice = s.response[0].meta.previousClose;
           } else {
               const firstValid = closes.find((c: any) => c !== null);
               if (firstValid) firstPrice = firstValid;
           }
           
           return { sym, shares, priceMap, lastKnownPrice: firstPrice };
        });

        // 3. Walk through chronological timeline and aggregate portfolio value
        const chartData = sortedTimes.map(ts => {
           let portfolioValue = 0;
           
           seriesData.forEach((series: any) => {
              if (series.priceMap.has(ts)) {
                 series.lastKnownPrice = series.priceMap.get(ts)!;
              }
              portfolioValue += series.lastKnownPrice * series.shares * rate;
           });

           const d = new Date(ts * 1000);
           const dateStr = ['1D', '1W'].includes(timeRange) 
              ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
              : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: ['ALL', '1Y'].includes(timeRange) ? 'numeric' : undefined });
           
           return {
             timestamp: ts,
             date: dateStr,
             value: portfolioValue
           };
        });

        // Add current value at the very end to ensure it meets today's precise live quote
        if (chartData.length > 0) {
            chartData[chartData.length - 1].value = totalValue * rate;
        }

        setHistoricalData(chartData);
      } catch (e) {
        console.error("Failed to fetch historical portfolio data", e);
      }
      setIsFetching(false);
    }

    fetchHistory();
  }, [timeRange, holdingsWithPrices, rate, totalValue]);

  const ranges = ['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'];
  
  // Dynamic color for chart based on selected timeframe
  const rangePnL = historicalData.length > 1 
    ? historicalData[historicalData.length - 1].value - historicalData[0].value 
    : totalPnL;
  const chartColor = rangePnL >= 0 ? '#4caf50' : '#ff3366';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Level Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '15px' }}>
          <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Total Balance</h3>
          <h1 style={{ margin: '10px 0 0 0', fontSize: '2rem', color: 'var(--foreground)', wordBreak: 'break-word' }}>
            {symbol}{(totalValue * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '15px' }}>
          <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Daily P&L (24h)</h3>
          <h1 style={{ margin: '10px 0 0 0', fontSize: '2rem', color: totalDailyPnL >= 0 ? '#4caf50' : '#ff3366', wordBreak: 'break-word' }}>
            {totalDailyPnL >= 0 ? '+' : ''}{symbol}{(totalDailyPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span style={{ fontSize: '1rem', marginLeft: '10px' }}>({totalDailyPnLPct.toFixed(2)}%)</span>
          </h1>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '15px' }}>
          <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>All-Time P&L</h3>
          <h1 style={{ margin: '10px 0 0 0', fontSize: '2rem', color: totalPnL >= 0 ? '#4caf50' : '#ff3366', wordBreak: 'break-word' }}>
            {totalPnL >= 0 ? '+' : ''}{symbol}{(totalPnL * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span style={{ fontSize: '1rem', marginLeft: '10px' }}>({totalPnLPct.toFixed(2)}%)</span>
          </h1>
        </div>
      </div>

      {/* Performance Graph (Middle) */}
      <div className="glass-panel" style={{ width: '100%', height: '450px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
            <h2 style={{ margin: 0, color: 'var(--foreground)' }}>Portfolio Performance</h2>
            <div style={{ display: 'flex', gap: '5px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '8px' }}>
                {ranges.map(r => (
                    <button 
                      key={r} 
                      onClick={() => setTimeRange(r)}
                      style={{ 
                          background: timeRange === r ? 'var(--accent-primary)' : 'transparent', 
                          color: timeRange === r ? 'var(--bg-primary)' : 'var(--text-secondary)',
                          border: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold'
                      }}
                    >
                        {r}
                    </button>
                ))}
            </div>
        </div>
        
        <div style={{ flex: 1, minHeight: 0, marginTop: '20px', position: 'relative' }}>
          {isFetching && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-secondary)', zIndex: 10 }}>
              Loading Real Market Data...
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{fontSize: 12}} dy={10} minTickGap={30} />
              <YAxis 
                 stroke="var(--text-secondary)" 
                 tickFormatter={(val) => val >= 1000 ? `${symbol}${(val / 1000).toFixed(1)}k` : `${symbol}${val.toFixed(0)}`}
                 domain={[
                    (dataMin: number) => (dataMin - Math.abs(dataMin) * 0.05), 
                    (dataMax: number) => (dataMax + Math.abs(dataMax) * 0.05)
                 ]}
                 tick={{fontSize: 12}}
                 dx={0}
                 width={70}
              />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--glass-border)', color: 'var(--foreground)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--foreground)' }}
                formatter={(value: any) => [`${symbol}${Number(value).toLocaleString(undefined, {maximumFractionDigits:2})}`, 'Value']}
              />
              <Area type="linear" dataKey="value" stroke={chartColor} strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Allocations Chart */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ marginTop: 0, borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', color: 'var(--foreground)' }}>Asset Allocation</h2>
          <div style={{ width: '100%', flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value">
                  {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--glass-border)', color: 'var(--foreground)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  formatter={(value: any) => [`${symbol}${Number(value || 0).toLocaleString(undefined, {maximumFractionDigits:2})}`, 'Value']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gainers / Losers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel">
            <h3 style={{ marginTop: 0, color: '#4caf50' }}>Top Gainers (24h)</h3>
            {gainers.filter(g => g.pctChange > 0).map(g => (
              <div key={g.ticker} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'var(--foreground)' }}>
                <strong>{g.ticker}</strong>
                <span style={{ color: '#4caf50' }}>+{g.pctChange.toFixed(2)}%</span>
              </div>
            ))}
            {gainers.filter(g => g.pctChange > 0).length === 0 && <span style={{ color: 'var(--text-secondary)' }}>No gainers today.</span>}
          </div>

          <div className="glass-panel">
            <h3 style={{ marginTop: 0, color: '#ff3366' }}>Top Losers (24h)</h3>
            {losers.filter(l => l.pctChange < 0).map(l => (
              <div key={l.ticker} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'var(--foreground)' }}>
                <strong>{l.ticker}</strong>
                <span style={{ color: '#ff3366' }}>{l.pctChange.toFixed(2)}%</span>
              </div>
            ))}
            {losers.filter(l => l.pctChange < 0).length === 0 && <span style={{ color: 'var(--text-secondary)' }}>No losers today!</span>}
          </div>
        </div>
      </div>

    </div>
  );
}
