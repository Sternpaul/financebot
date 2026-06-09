"use client";

import { useState, useTransition } from "react";
import { updateCustomAlerts } from "@/app/watchlist/actions";

export default function AlertsManager({ ticker, initialAlerts }: { ticker: string, initialAlerts: any }) {
  const alerts = initialAlerts || {};
  const [btfd, setBtfd] = useState(alerts.btfd !== undefined ? alerts.btfd : "");
  const [breakout, setBreakout] = useState(alerts.breakout !== undefined ? alerts.breakout : "");
  const [targetAbove, setTargetAbove] = useState(alerts.target_above !== undefined ? alerts.target_above : "");
  const [targetBelow, setTargetBelow] = useState(alerts.target_below !== undefined ? alerts.target_below : "");
  
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    startTransition(async () => {
      const payload: any = {};
      if (btfd !== "") payload.btfd = parseFloat(btfd);
      if (breakout !== "") payload.breakout = parseFloat(breakout);
      if (targetAbove !== "") payload.target_above = parseFloat(targetAbove);
      if (targetBelow !== "") payload.target_below = parseFloat(targetBelow);
      
      await updateCustomAlerts(ticker, payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="glass-panel">
      <h3 style={{ marginTop: 0, color: 'var(--foreground)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Alert Triggers</span>
        <button onClick={handleSave} disabled={isPending} style={{ padding: '6px 12px', fontSize: '0.8rem', height: 'auto', background: saved ? 'var(--success)' : '' }}>
          {isPending ? "Saving..." : saved ? "Saved!" : "Save Config"}
        </button>
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--danger)' }}>Buy The Dip (BTFD)</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Alert if dropped % with volume spike</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>-</span>
            <input type="number" step="0.1" style={{ width: '80px', padding: '5px', textAlign: 'right' }} placeholder="5.0" value={btfd} onChange={e => setBtfd(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)' }}>%</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>Breakout (Pump)</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Alert if pumped % with volume spike</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>+</span>
            <input type="number" step="0.1" style={{ width: '80px', padding: '5px', textAlign: 'right' }} placeholder="5.0" value={breakout} onChange={e => setBreakout(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)' }}>%</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>Price Target (Above)</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Alert if price crosses exactly above</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>$</span>
            <input type="number" step="any" style={{ width: '80px', padding: '5px', textAlign: 'right' }} placeholder="200" value={targetAbove} onChange={e => setTargetAbove(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)', opacity: 0 }}>%</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--accent-secondary)' }}>Price Target (Below)</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Alert if price crosses exactly below</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>$</span>
            <input type="number" step="any" style={{ width: '80px', padding: '5px', textAlign: 'right' }} placeholder="150" value={targetBelow} onChange={e => setTargetBelow(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)', opacity: 0 }}>%</span>
          </div>
        </div>

      </div>
    </div>
  );
}
