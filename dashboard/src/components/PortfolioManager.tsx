"use client";

import { useState, useTransition, useEffect } from "react";
import { addHolding, getHistoricalPrice } from "@/app/portfolio/actions";

export default function PortfolioManager() {
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [dateBought, setDateBought] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (ticker && ticker.length >= 2 && dateBought) {
      const fetchPrice = async () => {
        setIsFetchingPrice(true);
        const price = await getHistoricalPrice(ticker, dateBought);
        if (price) {
          setAvgCost(price.toFixed(2));
        }
        setIsFetchingPrice(false);
      };
      
      const timeoutId = setTimeout(fetchPrice, 500); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [ticker, dateBought]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !shares || !avgCost) return;
    
    startTransition(async () => {
      await addHolding(ticker, parseFloat(shares), parseFloat(avgCost));
      setTicker("");
      setShares("");
      setDateBought("");
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
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date Bought</label>
          <input type="date" value={dateBought} onChange={e => setDateBought(e.target.value)} required />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '150px', position: 'relative' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Avg Cost ($) {isFetchingPrice && <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>Fetching...</span>}
          </label>
          <input type="number" step="any" value={avgCost} onChange={e => setAvgCost(e.target.value)} placeholder="Auto-filled" required />
        </div>
        <button type="submit" disabled={isPending} style={{ flex: '0 0 auto', height: '39px' }}>
          {isPending ? 'Adding...' : 'Add Position'}
        </button>
      </form>
    </div>
  );
}
