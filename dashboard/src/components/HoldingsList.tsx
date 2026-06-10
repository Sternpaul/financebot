"use client";

import { useTransition } from "react";
import Link from "next/link";
import { LineChart, Line, ResponsiveContainer, YAxis, AreaChart, Area } from "recharts";
import { useAppContext } from "./AppContext";
import { removeFromWatchlist } from "@/app/watchlist/actions";

export default function HoldingsList({ holdings, mode = "portfolio" }: { holdings: any[], mode?: "portfolio" | "watchlist" }) {
  const { currency } = useAppContext();
  const isEur = currency === "EUR";
  const symbol = isEur ? "€" : "$";
  const rate = isEur ? 0.92 : 1.0;

  const [isPending, startTransition] = useTransition();

  const handleDeleteWatchlist = (id: number) => {
    if (confirm("Are you sure you want to delete this tracked asset?")) {
      startTransition(async () => {
        await removeFromWatchlist(id);
      });
    }
  };

  if (!holdings || holdings.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "40px" }}>
      <h2 style={{ margin: "0 0 10px 0", color: "var(--foreground)" }}>{mode === "portfolio" ? "Individual Holdings" : "Tracked Assets"}</h2>
      
      {/* Header Row */}
      <div style={{ display: "grid", gridTemplateColumns: mode === "portfolio" ? "1.5fr 1fr 1fr 1.5fr" : "1.5fr 1fr 1fr 0.5fr", gap: "10px", padding: "0 20px 10px 20px", borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: "bold" }}>
        <div>Symbol</div>
        <div>Daily Chart</div>
        <div style={{ textAlign: "right" }}>Price & Change</div>
        {mode === "portfolio" && <div style={{ textAlign: "right" }}>Position & P&L</div>}
        {mode === "watchlist" && <div style={{ textAlign: "right" }}>Actions</div>}
      </div>

      {/* List Rows */}
      {holdings.map((h) => {
        const priceStr = (h.currentPrice * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const isPositive = h.pctChange >= 0;
        const color = isPositive ? "var(--success)" : "var(--danger)";
        
        const totalValue = h.shares * h.currentPrice * rate;
        const totalCost = h.shares * h.avg_cost * rate;
        const allTimePnL = totalValue - totalCost;
        const allTimePnLPct = totalCost > 0 ? (allTimePnL / totalCost) * 100 : 0;
        
        const sparkData = h.sparkline && h.sparkline.length > 0 ? h.sparkline : [{ value: h.avg_cost }, { value: h.currentPrice }];
        
        return (
          <div key={h.id || h.ticker} className="glass-panel" style={{ display: "grid", gridTemplateColumns: mode === "portfolio" ? "1.5fr 1fr 1fr 1.5fr" : "1.5fr 1fr 1fr 0.5fr", gap: "10px", padding: "16px 20px", alignItems: "center", transition: "all 0.2s ease" }}>
            
            {/* 1. Identity */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
              {h.isCash ? (
                 <span style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--foreground)" }}>{h.ticker}</span>
              ) : (
                <Link href={`/watchlist/${encodeURIComponent(h.ticker)}`} style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--foreground)", textDecoration: "none" }}>
                  {h.ticker}
                </Link>
              )}
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {h.longName || (h.isCash ? "Cash Balance" : "")}
              </span>
            </div>

            {/* 2. Sparkline */}
            <div style={{ height: "40px", width: "100%", paddingRight: "20px" }}>
              {!h.isCash && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData}>
                    <defs>
                      <linearGradient id={`colorValue-${h.id || h.ticker}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <YAxis domain={['dataMin', 'dataMax']} hide />
                    <Area type="linear" dataKey="value" stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#colorValue-${h.id || h.ticker})`} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 3. Price & Daily Change */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "right" }}>
              <span style={{ fontSize: "1rem", fontWeight: "600", color: "var(--foreground)" }}>{symbol}{priceStr}</span>
              {!h.isCash && (
                <span style={{ fontSize: "0.85rem", color: color, fontWeight: "500" }}>
                  {isPositive ? "+" : ""}{h.pctChange?.toFixed(2)}%
                </span>
              )}
            </div>

            {/* 4. Position & All-Time P&L (Portfolio Only) */}
            {mode === "portfolio" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "right" }}>
                <span style={{ fontSize: "1rem", fontWeight: "600", color: "var(--foreground)" }}>
                  {symbol}{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {!h.isCash && (
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", alignItems: "center" }}>
                     <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{h.shares}x</span>
                     <span style={{ fontSize: "0.85rem", color: allTimePnL >= 0 ? "var(--success)" : "var(--danger)" }}>
                       {allTimePnL >= 0 ? "+" : ""}{symbol}{allTimePnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({allTimePnLPct.toFixed(2)}%)
                     </span>
                  </div>
                )}
              </div>
            )}

            {/* 5. Actions (Watchlist Only) */}
            {mode === "watchlist" && (
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", alignItems: "center" }}>
                <button onClick={() => handleDeleteWatchlist(h.id)} title="Delete Tracked Asset" className="outline" style={{ padding: "6px", display: "flex", border: "none", color: "var(--danger)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}
