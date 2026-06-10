"use client";

import { useState, useTransition, useEffect } from "react";
import { addTransaction, getHistoricalPrice, searchTickers } from "@/app/portfolio/actions";
import { useAppContext } from "./AppContext";

export default function PortfolioManager() {
  const { currency } = useAppContext();
  const isEur = currency === 'EUR';
  const symbol = isEur ? '€' : '$';

  const [type, setType] = useState("BUY"); // 'BUY', 'SELL', 'CASH_ADD', 'CASH_REMOVE'
  const [ticker, setTicker] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [shares, setShares] = useState("");
  const [dateBought, setDateBought] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Search Debounce Effect
  useEffect(() => {
    if (searchQuery.length >= 2 && showDropdown && (type === 'BUY' || type === 'SELL')) {
      const search = async () => {
        const results = await searchTickers(searchQuery);
        setSearchResults(results.filter((r: any) => r.quoteType === 'EQUITY' || r.quoteType === 'CRYPTOCURRENCY' || r.quoteType === 'ETF'));
      };
      const id = setTimeout(search, 400);
      return () => clearTimeout(id);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, showDropdown, type]);

  useEffect(() => {
    if (ticker && ticker.length >= 2 && dateBought && (type === 'BUY' || type === 'SELL')) {
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
  }, [ticker, dateBought, type]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateBought) return;
    
    startTransition(async () => {
      let submitTicker = null;
      let submitShares = null;
      let submitPrice = null;

      if (type === 'BUY' || type === 'SELL') {
        if (!ticker || !shares || !avgCost) return;
        submitTicker = ticker;
        submitShares = parseFloat(shares);
        submitPrice = parseFloat(avgCost);
      } else {
        // Cash deposit/withdrawal
        if (!avgCost) return; // We use avgCost input as the "Amount"
        // Convert input EUR to USD baseline if EUR is selected
        const convertedCost = isEur ? parseFloat(avgCost) / 0.92 : parseFloat(avgCost);
        submitPrice = convertedCost; 
      }

      const res = await addTransaction(type, submitTicker, submitShares, submitPrice, dateBought);
      
      if (!res.success) {
          alert("Failed to add transaction: " + (res.error || "Unknown error"));
          return;
      }

      setTicker("");
      setShares("");
      setDateBought("");
      setAvgCost("");
      setSearchQuery("");
    });
  };

  const isCash = type === 'CASH_ADD' || type === 'CASH_REMOVE';

  return (
    <div className="glass-panel" style={{ marginBottom: '40px' }}>
      <h3 style={{ marginTop: 0, color: 'var(--foreground)' }}>Log Transaction</h3>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '0 0 auto' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Type</label>
          <select value={type} onChange={e => { setType(e.target.value); setTicker(""); setSearchQuery(""); setAvgCost(""); setShares(""); }} style={{ padding: '8px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--foreground)', border: '1px solid var(--glass-border)' }}>
            <option value="BUY">Buy Asset</option>
            <option value="SELL">Sell Asset</option>
            <option value="CASH_ADD">Deposit Cash</option>
            <option value="CASH_REMOVE">Withdraw Cash</option>
          </select>
        </div>

        {!isCash && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Asset / Ticker</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={searchQuery} 
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setTicker(e.target.value.toUpperCase());
                  setShowDropdown(true);
                }} 
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Apple or AAPL" 
                required={!isCash} 
                style={{ width: '100%' }}
              />
              {showDropdown && searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px', overflow: 'hidden', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                  {searchResults.map(res => (
                    <div 
                      key={res.symbol} 
                      onClick={() => {
                        setTicker(res.symbol);
                        setSearchQuery(res.symbol);
                        setShowDropdown(false);
                      }}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-primary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontWeight: 'bold', color: 'var(--foreground)' }}>{res.symbol}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{res.shortname || res.longname}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!isCash && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '100px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Shares</label>
            <input type="number" step="any" value={shares} onChange={e => setShares(e.target.value)} placeholder="10" required={!isCash} />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '150px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date</label>
          <input type="date" value={dateBought} onChange={e => setDateBought(e.target.value)} required />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '150px', position: 'relative' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {isCash ? `Amount (${symbol})` : `Price per share (${symbol})`} {isFetchingPrice && <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>Fetching...</span>}
          </label>
          <input type="number" step="any" value={avgCost} onChange={e => setAvgCost(e.target.value)} placeholder={isCash ? "5000" : "Auto-filled"} required />
        </div>

        <button type="submit" disabled={isPending} style={{ flex: '0 0 auto', height: '39px' }}>
          {isPending ? 'Logging...' : 'Log Transaction'}
        </button>
      </form>
    </div>
  );
}
