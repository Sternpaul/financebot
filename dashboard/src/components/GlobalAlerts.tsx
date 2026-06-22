import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Link from 'next/link';

export default async function GlobalAlerts() {
  const { data: watchlists } = await supabaseAdmin.from('watchlist').select('*');
  
  const activeAlerts = (watchlists || []).filter(w => 
    w.custom_alerts && Object.keys(w.custom_alerts).length > 0
  );

  return (
    <div style={{ marginTop: '30px' }}>
      <h2 style={{ color: 'var(--foreground)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
        Global Alert Configurations
      </h2>
      
      {activeAlerts.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No custom alerts configured across your portfolio.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px', marginTop: '15px' }}>
          {activeAlerts.map(item => {
            const rules = item.custom_alerts;
            return (
              <div key={item.ticker} style={{ background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: 'var(--foreground)' }}>{item.ticker}</h3>
                  <Link href={`/watchlist/${item.ticker}`} style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>
                    Edit →
                  </Link>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                  {rules.pct_change && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Percentage Target:</span>
                      <strong style={{ color: 'var(--foreground)' }}>±{rules.pct_change}%</strong>
                    </div>
                  )}
                  {rules.price_target && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Price Target:</span>
                      <strong style={{ color: 'var(--accent-primary)' }}>${rules.price_target} ({rules.price_direction === 'UP' ? 'Above' : 'Below'})</strong>
                    </div>
                  )}
                  {rules.vol_spike && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', paddingTop: '5px', borderTop: '1px dashed var(--glass-border)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Volume Modifier:</span>
                      <strong>{rules.vol_spike}x Avg</strong>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
