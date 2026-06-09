"use client";

import { useState, useTransition } from "react";
import { updateCustomAlerts } from "@/app/watchlist/actions";

export default function AlertsManager({ ticker, initialAlerts, currentPrice }: { ticker: string, initialAlerts: any, currentPrice: number }) {
  const alerts = initialAlerts || {};
  const [pctChange, setPctChange] = useState(alerts.pct_change !== undefined ? alerts.pct_change : "");
  const [priceTarget, setPriceTarget] = useState(alerts.price_target !== undefined ? alerts.price_target : "");
  
  const [volSpikeEnabled, setVolSpikeEnabled] = useState(alerts.vol_spike !== undefined);
  const [volSpike, setVolSpike] = useState(alerts.vol_spike !== undefined ? alerts.vol_spike : "1.5");
  
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    startTransition(async () => {
      const payload: any = {};
      
      if (pctChange !== "") {
        payload.pct_change = parseFloat(pctChange);
      }
      
      if (priceTarget !== "") {
        const target = parseFloat(priceTarget);
        payload.price_target = target;
        payload.price_direction = target > currentPrice ? "UP" : "DOWN";
      }
      
      if (volSpikeEnabled && volSpike !== "") {
        payload.vol_spike = parseFloat(volSpike);
      }
      
      await updateCustomAlerts(ticker, payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const PresetButton = ({ label, onClick }: { label: string, onClick: () => void }) => (
    <button type="button" onClick={onClick} style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '4px' }}>
      {label}
    </button>
  );

  return (
    <div className="glass-panel">
      <h3 style={{ marginTop: 0, color: 'var(--foreground)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Alert Configurations</span>
        <button onClick={handleSave} disabled={isPending} style={{ padding: '6px 12px', fontSize: '0.8rem', height: 'auto', background: saved ? 'var(--success)' : '' }}>
          {isPending ? "Saving..." : saved ? "Saved!" : "Save Config"}
        </button>
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
        
        {/* Percentage Target */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--foreground)' }}>Percentage Change</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Alerts on ±% daily move</div>
            <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
              <PresetButton label="±2%" onClick={() => setPctChange("2.0")} />
              <PresetButton label="±5%" onClick={() => setPctChange("5.0")} />
              <PresetButton label="±10%" onClick={() => setPctChange("10.0")} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>±</span>
            <input type="number" step="0.1" style={{ width: '80px', padding: '8px', textAlign: 'right', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--foreground)', borderRadius: '4px' }} placeholder="5.0" value={pctChange} onChange={e => setPctChange(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)' }}>%</span>
          </div>
        </div>

        {/* Price Target */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--foreground)' }}>Price Target</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Alert when hitting exactly</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>$</span>
            <input type="number" step="any" style={{ width: '80px', padding: '8px', textAlign: 'right', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--foreground)', borderRadius: '4px' }} placeholder="200" value={priceTarget} onChange={e => setPriceTarget(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)', opacity: 0 }}>%</span>
          </div>
        </div>
        
        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '5px 0' }} />

        {/* Volume Spike Modifier */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--foreground)' }}>
            <input type="checkbox" checked={volSpikeEnabled} onChange={e => setVolSpikeEnabled(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
            <strong>Require Volume Spike</strong>
          </label>
          {volSpikeEnabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '26px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Trigger only on high volume</div>
                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                  <PresetButton label="1.5x" onClick={() => setVolSpike("1.5")} />
                  <PresetButton label="2.0x" onClick={() => setVolSpike("2.0")} />
                  <PresetButton label="3.0x" onClick={() => setVolSpike("3.0")} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input type="number" step="0.1" style={{ width: '80px', padding: '8px', textAlign: 'right', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--foreground)', borderRadius: '4px' }} placeholder="1.5" value={volSpike} onChange={e => setVolSpike(e.target.value)} />
                <span style={{ color: 'var(--text-secondary)' }}>x</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
