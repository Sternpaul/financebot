"use client";

import { useState, useTransition } from "react";
import { addHolding } from "@/app/portfolio/actions";

export default function PortfolioManager() {
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !shares || !avgCost) return;
    
    startTransition(async () => {
      await addHolding(ticker, parseFloat(shares), parseFloat(avgCost));
      setTicker("");
      setShares("");
      setAvgCost("");
    });
  };

  return (
    <div className="glass-panel" style={{ marginBottom: '40px' }}>
      <h3 style={{ marginTop: 0, color: 'var(--foreground)' }}>Add Holding</h3>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '150px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ticker</label>
          <input type="text" value={ticker} onChange={e => setTicker(e.target.value)} placeholder="AAPL" required />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '150px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Shares</label>
          <input type="number" step="any" value={shares} onChange={e => setShares(e.target.value)} placeholder="10" required />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '150px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Avg Cost ($)</label>
          <input type="number" step="any" value={avgCost} onChange={e => setAvgCost(e.target.value)} placeholder="150.50" required />
        </div>
        <button type="submit" disabled={isPending} style={{ flex: '0 0 auto', height: '39px' }}>
          {isPending ? 'Adding...' : 'Add Position'}
        </button>
      </form>
    </div>
  );
}
