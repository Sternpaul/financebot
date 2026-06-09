import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default async function AlertsHistory() {
  const { data: alerts } = await supabase
    .from('technical_alerts')
    .select('*')
    .order('triggered_at', { ascending: false })
    .limit(100);

  return (
    <main className="page-container animate-fade-in">
      <h1 className="header-title">Alert <span className="text-gradient">History</span></h1>
      
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <h2 style={{ marginTop: 0, color: 'var(--foreground)' }}>Triggered Events</h2>
        
        {!alerts || alerts.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No alerts have been triggered yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', minWidth: '600px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Time</th>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Ticker</th>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Event Type</th>
                <th style={{ padding: '10px', textAlign: 'right', color: 'var(--text-secondary)' }}>Price at Event</th>
                <th style={{ padding: '10px', textAlign: 'right', color: 'var(--text-secondary)' }}>Change %</th>
                <th style={{ padding: '10px', textAlign: 'right', color: 'var(--text-secondary)' }}>Vol Ratio</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(alert => {
                const isBearish = alert.alert_type.includes('DOWN') || alert.alert_type.includes('BELOW') || alert.alert_type === 'BTFD';
                return (
                  <tr key={alert.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '12px 10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {new Date(alert.triggered_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>
                      <Link href={`/watchlist/${alert.ticker}`} style={{ color: 'var(--foreground)', textDecoration: 'underline' }}>
                        {alert.ticker}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        background: isBearish ? 'rgba(255,51,102,0.1)' : 'rgba(0,255,153,0.1)',
                        color: isBearish ? 'var(--danger)' : 'var(--success)'
                      }}>
                        {alert.alert_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--foreground)' }}>
                      ${alert.price_at_alert?.toFixed(2) || '-'}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: alert.pct_change < 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {alert.pct_change > 0 ? '+' : ''}{alert.pct_change?.toFixed(2) || '-'}%
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {alert.volume_ratio ? `${alert.volume_ratio.toFixed(1)}x` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
