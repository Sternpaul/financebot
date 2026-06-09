"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAppContext } from './AppContext';
import { useMemo } from 'react';

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

  // Mock 30-day historical data ending at today's total value
  const historicalData = useMemo(() => {
    const data = [];
    let currentValue = totalValue * rate;
    const now = new Date();
    // Start from 30 days ago and generate random noise trending towards today's value
    const startValue = currentValue * 0.85; // Assume 15% growth over 30 days for mock data
    for (let i = 30; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      
      const progress = (30 - i) / 30; // 0 to 1
      const trendValue = startValue + (currentValue - startValue) * progress;
      const noise = (Math.random() - 0.5) * (currentValue * 0.05); // +/- 2.5% noise
      
      data.push({
        date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: i === 0 ? currentValue : trendValue + noise
      });
    }
    return data;
  }, [totalValue, rate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Level Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Total Balance</h3>
          <h1 style={{ margin: '10px 0 0 0', fontSize: '2.5rem', color: 'var(--foreground)' }}>
            {symbol}{(totalValue * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Daily P&L (24h)</h3>
          <h1 style={{ margin: '10px 0 0 0', fontSize: '2.5rem', color: totalDailyPnL >= 0 ? '#4caf50' : '#ff3366' }}>
            {totalDailyPnL >= 0 ? '+' : ''}{symbol}{(totalDailyPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span style={{ fontSize: '1rem', marginLeft: '10px' }}>({totalDailyPnLPct.toFixed(2)}%)</span>
          </h1>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>All-Time P&L</h3>
          <h1 style={{ margin: '10px 0 0 0', fontSize: '2.5rem', color: totalPnL >= 0 ? '#4caf50' : '#ff3366' }}>
            {totalPnL >= 0 ? '+' : ''}{symbol}{(totalPnL * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span style={{ fontSize: '1rem', marginLeft: '10px' }}>({totalPnLPct.toFixed(2)}%)</span>
          </h1>
        </div>
      </div>

      {/* Performance Graph (Middle) */}
      <div className="glass-panel" style={{ width: '100%', height: '400px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginTop: 0, borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', color: 'var(--foreground)' }}>Portfolio Performance</h2>
        <div style={{ flex: 1, minHeight: 0, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={totalPnL >= 0 ? '#4caf50' : '#ff3366'} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={totalPnL >= 0 ? '#4caf50' : '#ff3366'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{fontSize: 12}} dy={10} minTickGap={30} />
              <YAxis 
                 stroke="var(--text-secondary)" 
                 tickFormatter={(val) => `${symbol}${(val / 1000).toFixed(1)}k`}
                 domain={['auto', 'auto']}
                 tick={{fontSize: 12}}
                 dx={-10}
              />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--glass-border)', color: 'var(--foreground)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--foreground)' }}
                formatter={(value: any) => [`${symbol}${Number(value).toLocaleString(undefined, {maximumFractionDigits:2})}`, 'Value']}
              />
              <Area type="monotone" dataKey="value" stroke={totalPnL >= 0 ? '#4caf50' : '#ff3366'} fillOpacity={1} fill="url(#colorValue)" />
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
