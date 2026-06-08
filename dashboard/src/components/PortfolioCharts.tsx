"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useAppContext } from './AppContext';

export default function PortfolioCharts({ holdingsWithPrices }: { holdingsWithPrices: any[] }) {
  const { currency } = useAppContext();
  const isEur = currency === 'EUR';
  const symbol = isEur ? '€' : '$';
  const rate = isEur ? 0.92 : 1.0;

  const totalValue = holdingsWithPrices.reduce((sum, h) => sum + (h.quantity * h.currentPrice), 0);
  const totalCost = holdingsWithPrices.reduce((sum, h) => sum + (h.quantity * h.average_price), 0);
  const totalPnL = totalValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  const data = holdingsWithPrices.map(h => ({
    name: h.ticker,
    value: h.quantity * h.currentPrice * rate
  })).sort((a, b) => b.value - a.value);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff3366', '#4caf50'];

  const gainers = [...holdingsWithPrices].sort((a, b) => b.pctChange - a.pctChange).slice(0, 3);
  const losers = [...holdingsWithPrices].sort((a, b) => a.pctChange - b.pctChange).slice(0, 3);

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
          <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>All-Time P&L</h3>
          <h1 style={{ margin: '10px 0 0 0', fontSize: '2.5rem', color: totalPnL >= 0 ? '#4caf50' : '#ff3366' }}>
            {totalPnL >= 0 ? '+' : ''}{symbol}{(totalPnL * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span style={{ fontSize: '1rem', marginLeft: '10px' }}>({totalPnLPct.toFixed(2)}%)</span>
          </h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Allocations Chart */}
        <div className="glass-panel">
          <h2 style={{ marginTop: 0, borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', color: 'var(--foreground)' }}>Asset Allocation</h2>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => `${symbol}${value.toLocaleString(undefined, {maximumFractionDigits:2})}`} />
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
