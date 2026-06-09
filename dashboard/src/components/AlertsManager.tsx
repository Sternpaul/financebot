"use client";

import { useState, useTransition } from "react";
import { updateCustomAlerts } from "@/app/watchlist/actions";

export default function AlertsManager({ ticker, initialAlerts }: { ticker: string, initialAlerts: any }) {
  const alerts = initialAlerts || {};
  const [pctUp, setPctUp] = useState(alerts.pct_up !== undefined ? alerts.pct_up : "");
  const [pctDown, setPctDown] = useState(alerts.pct_down !== undefined ? alerts.pct_down : "");
  const [priceUp, setPriceUp] = useState(alerts.price_up !== undefined ? alerts.price_up : "");
  const [priceDown, setPriceDown] = useState(alerts.price_down !== undefined ? alerts.price_down : "");
  
  const [volSpikeEnabled, setVolSpikeEnabled] = useState(alerts.vol_spike !== undefined);
  const [volSpike, setVolSpike] = useState(alerts.vol_spike !== undefined ? alerts.vol_spike : "1.5");
  
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    startTransition(async () => {
      const payload: any = {};
      if (pctUp !== "") payload.pct_up = parseFloat(pctUp);
      if (pctDown !== "") payload.pct_down = parseFloat(pctDown);
      if (priceUp !== "") payload.price_up = parseFloat(priceUp);
      if (priceDown !== "") payload.price_down = parseFloat(priceDown);
      if (volSpikeEnabled && volSpike !== "") payload.vol_spike = parseFloat(volSpike);
      
      await updateCustomAlerts(ticker, payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const PresetButton = ({ label, onClick }: { label: string, onClick: () => void }) => (
    <button type="button" onClick={onClick} style={{ padding: '2px 6px', fontSize: '0.7rem', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '4px' }}>
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
        
        {/* Percentage Target Up */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>Percentage Up</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Alert on daily % gain</div>
            <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
              <PresetButton label="+2%" onClick={() => setPctUp("2.0")} />
              <PresetButton label="+5%" onClick={() => setPctUp("5.0")} />
              <PresetButton label="+10%" onClick={() => setPctUp("10.0")} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>+</span>
            <input type="number" step="0.1" style={{ width: '80px', padding: '5px', textAlign: 'right' }} placeholder="5.0" value={pctUp} onChange={e => setPctUp(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)' }}>%</span>
          </div>
        </div>

        {/* Percentage Target Down */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--danger)' }}>Percentage Down</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Alert on daily % loss</div>
            <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
              <PresetButton label="-2%" onClick={() => setPctDown("2.0")} />
              <PresetButton label="-5%" onClick={() => setPctDown("5.0")} />
              <PresetButton label="-10%" onClick={() => setPctDown("10.0")} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>-</span>
            <input type="number" step="0.1" style={{ width: '80px', padding: '5px', textAlign: 'right' }} placeholder="5.0" value={pctDown} onChange={e => setPctDown(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)' }}>%</span>
          </div>
        </div>

        {/* Price Target Above */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>Price Target (Above)</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Alert when crossing above price</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>$</span>
            <input type="number" step="any" style={{ width: '80px', padding: '5px', textAlign: 'right' }} placeholder="200" value={priceUp} onChange={e => setPriceUp(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)', opacity: 0 }}>%</span>
          </div>
        </div>

        {/* Price Target Below */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--accent-secondary)' }}>Price Target (Below)</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Alert when crossing below price</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>$</span>
            <input type="number" step="any" style={{ width: '80px', padding: '5px', textAlign: 'right' }} placeholder="150" value={priceDown} onChange={e => setPriceDown(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)', opacity: 0 }}>%</span>
          </div>
        </div>
        
        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '5px 0' }} />

        {/* Volume Spike Modifier */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--foreground)' }}>
            <input type="checkbox" checked={volSpikeEnabled} onChange={e => setVolSpikeEnabled(e.target.checked)} style={{ width: '16px', height: '16px' }} />
            <strong>Require Volume Spike</strong>
          </label>
          {volSpikeEnabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '26px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Only trigger if volume is higher than average</div>
                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                  <PresetButton label="1.5x" onClick={() => setVolSpike("1.5")} />
                  <PresetButton label="2.0x" onClick={() => setVolSpike("2.0")} />
                  <PresetButton label="3.0x" onClick={() => setVolSpike("3.0")} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input type="number" step="0.1" style={{ width: '80px', padding: '5px', textAlign: 'right' }} placeholder="1.5" value={volSpike} onChange={e => setVolSpike(e.target.value)} />
                <span style={{ color: 'var(--text-secondary)' }}>x</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
