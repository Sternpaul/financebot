"use client";

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function RiskCockpit({ holdings, sectors }: { holdings: any[], sectors: Record<string, string> }) {
  
  const metrics = useMemo(() => {
    let totalCash = 0;
    let totalEquity = 0;
    const positions: { ticker: string, value: number, sector: string }[] = [];

    holdings.forEach(h => {
      const value = h.shares * h.currentPrice;
      if (h.isCash) {
        totalCash += value;
      } else {
        totalEquity += value;
        positions.push({
          ticker: h.ticker,
          value,
          sector: sectors[h.ticker] || 'Unknown / Crypto'
        });
      }
    });

    const totalValue = totalCash + totalEquity;

    // Largest Position
    let maxPos = null;
    if (positions.length > 0) {
       maxPos = positions.reduce((prev, current) => (prev.value > current.value) ? prev : current);
    }

    // Sector Aggregation
    const sectorTotals: Record<string, number> = {};
    positions.forEach(p => {
      sectorTotals[p.sector] = (sectorTotals[p.sector] || 0) + p.value;
    });

    const sectorData = Object.entries(sectorTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { totalCash, totalEquity, totalValue, maxPos, sectorData };
  }, [holdings, sectors]);

  const { totalCash, totalEquity, totalValue, maxPos, sectorData } = metrics;

  const cashPct = totalValue > 0 ? ((totalCash / totalValue) * 100).toFixed(1) : '0.0';
  const equityPct = totalValue > 0 ? ((totalEquity / totalValue) * 100).toFixed(1) : '0.0';

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Cash vs Equity */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Asset Allocation</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
            <div>
               <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--foreground)' }}>{equityPct}%</div>
               <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Equity Exposure</div>
            </div>
            <div style={{ textAlign: 'right' }}>
               <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--success)' }}>{cashPct}%</div>
               <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Cash Reserves</div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
             <div style={{ width: `${equityPct}%`, background: 'var(--accent-primary)', height: '100%' }}></div>
             <div style={{ width: `${cashPct}%`, background: 'var(--success)', height: '100%' }}></div>
          </div>
        </div>

        {/* Largest Position */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Concentration Risk</h3>
          {maxPos ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
              <div>
                 <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--danger)' }}>{((maxPos.value / totalValue) * 100).toFixed(1)}%</div>
                 <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Largest Single Asset</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                 <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--foreground)' }}>{maxPos.ticker}</div>
                 <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{sectors[maxPos.ticker] || 'Unknown'}</div>
              </div>
            </div>
          ) : (
             <div style={{ color: 'var(--text-secondary)', marginTop: '20px' }}>No active positions.</div>
          )}
        </div>
      </div>

      {/* Sector Exposure Chart */}
      <div className="glass-panel" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: 0, color: 'var(--text-secondary)', marginBottom: '20px' }}>Sector Exposure</h3>
        {sectorData.length > 0 ? (
          <div style={{ flex: 1, width: '100%', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={130}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   formatter={(value: any) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                   contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--foreground)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ color: 'var(--text-secondary)', marginTop: '20px' }}>No sector data available.</div>
        )}
      </div>

    </div>
  );
}
