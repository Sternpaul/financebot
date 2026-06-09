"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { LineChart, Line, ResponsiveContainer, YAxis, AreaChart, Area } from "recharts";
import { useAppContext } from "./AppContext";
import { updateHolding, deleteHolding } from "@/app/portfolio/actions";

export default function HoldingsList({ holdings, mode = "portfolio" }: { holdings: any[], mode?: "portfolio" | "watchlist" }) {
  const { currency } = useAppContext();
  const isEur = currency === "EUR";
  const symbol = isEur ? "€" : "$";
  const rate = isEur ? 0.92 : 1.0;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editShares, setEditShares] = useState("");
  const [editCost, setEditCost] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleEditClick = (h: any) => {
    setEditingId(h.id);
    setEditShares(h.shares.toString());
    setEditCost(h.avg_cost.toString());
  };

  const handleSave = (id: number) => {
    startTransition(async () => {
      await updateHolding(id, parseFloat(editShares), parseFloat(editCost));
      setEditingId(null);
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this position?")) {
      startTransition(async () => {
        await deleteHolding(id);
      });
    }
  };

  if (!holdings || holdings.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "40px" }}>
      <h2 style={{ margin: "0 0 10px 0", color: "var(--foreground)" }}>{mode === "portfolio" ? "Individual Holdings" : "Tracked Assets"}</h2>
      
      {/* Header Row */}
      <div style={{ display: "grid", gridTemplateColumns: mode === "portfolio" ? "1.5fr 1fr 1fr 1.5fr 0.8fr" : "1.5fr 1fr 1fr 0.5fr", gap: "10px", padding: "0 20px 10px 20px", borderBottom: "1px solid var(--glass-border)", color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: "bold" }}>
        <div>Symbol</div>
        <div>Daily Chart</div>
        <div style={{ textAlign: "right" }}>Price & Change</div>
        {mode === "portfolio" && <div style={{ textAlign: "right" }}>Position & P&L</div>}
        <div style={{ textAlign: "right" }}>Actions</div>
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
          <div key={h.id} className="glass-panel" style={{ display: "grid", gridTemplateColumns: mode === "portfolio" ? "1.5fr 1fr 1fr 1.5fr 0.8fr" : "1.5fr 1fr 1fr 0.5fr", gap: "10px", padding: "16px 20px", alignItems: "center", transition: "all 0.2s ease" }}>
            
            {/* 1. Identity */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
              <Link href={`/watchlist/${encodeURIComponent(h.ticker)}`} style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--foreground)", textDecoration: "none" }}>
                {h.ticker}
              </Link>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {h.longName}
              </span>
            </div>

            {/* 2. Sparkline */}
            <div style={{ height: "40px", width: "100%", paddingRight: "20px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData}>
                  <defs>
                    <linearGradient id={`colorValue-${h.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <YAxis domain={['dataMin', 'dataMax']} hide />
                  <Area type="linear" dataKey="value" stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#colorValue-${h.id})`} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* 3. Price & Daily Change */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "right" }}>
              <span style={{ fontSize: "1rem", fontWeight: "600", color: "var(--foreground)" }}>{symbol}{priceStr}</span>
              <span style={{ fontSize: "0.85rem", color: color, fontWeight: "500" }}>
                {isPositive ? "+" : ""}{h.pctChange.toFixed(2)}%
              </span>
            </div>

            {/* 4. Position & All-Time P&L (Portfolio Only) */}
            {mode === "portfolio" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "right" }}>
                {editingId === h.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Shares:</span>
                      <input type="number" step="any" value={editShares} onChange={e => setEditShares(e.target.value)} style={{ width: "70px", padding: "4px", fontSize: "0.8rem" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Cost:</span>
                      <input type="number" step="any" value={editCost} onChange={e => setEditCost(e.target.value)} style={{ width: "70px", padding: "4px", fontSize: "0.8rem" }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <span style={{ fontSize: "1rem", fontWeight: "600", color: "var(--foreground)" }}>
                      {symbol}{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", alignItems: "center" }}>
                       <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{h.shares}x</span>
                       <span style={{ fontSize: "0.85rem", color: allTimePnL >= 0 ? "var(--success)" : "var(--danger)" }}>
                         {allTimePnL >= 0 ? "+" : ""}{symbol}{allTimePnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({allTimePnLPct.toFixed(2)}%)
                       </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 5. Actions */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", alignItems: "center" }}>
              {editingId === h.id ? (
                <>
                  <button onClick={() => handleSave(h.id)} disabled={isPending} style={{ padding: "4px 8px", fontSize: "0.8rem" }}>Save</button>
                  <button onClick={() => setEditingId(null)} disabled={isPending} className="outline" style={{ padding: "4px 8px", fontSize: "0.8rem" }}>Cancel</button>
                </>
              ) : (
                <>
                  {mode === "portfolio" && (
                    <button onClick={() => handleEditClick(h)} title="Edit Position" className="outline" style={{ padding: "6px", display: "flex", border: "none", color: "var(--text-secondary)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                  )}
                  <button onClick={() => handleDelete(h.id)} title="Delete Position" className="outline" style={{ padding: "6px", display: "flex", border: "none", color: "var(--danger)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </>
              )}
            </div>

          </div>
        );
      })}
    </div>
  );
}
