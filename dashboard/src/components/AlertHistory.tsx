import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Link from 'next/link';

export default async function AlertHistory() {
  const { data: alerts, error } = await supabaseAdmin
    .from('technical_alerts')
    .select('*, alert_performance(forward_3d, forward_7d, forward_30d)')
    .order('triggered_at', { ascending: false })
    .limit(50);

  return (
    <div style={{ marginTop: '30px' }}>
      <h2 style={{ color: 'var(--foreground)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
        Alert History (Last 50 Events)
      </h2>
      
      <div style={{ overflowX: 'auto' }}>
        {!alerts || alerts.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No alerts have been triggered yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', minWidth: '600px', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '8px', color: 'var(--text-secondary)' }}>Time</th>
                <th style={{ padding: '8px', color: 'var(--text-secondary)' }}>Ticker</th>
                <th style={{ padding: '8px', color: 'var(--text-secondary)' }}>Event</th>
                <th style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>Price</th>
                <th style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>Change</th>
                <th style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>3d Ret</th>
                <th style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>7d Ret</th>
                <th style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>30d Ret</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(alert => {
                const isBearish = alert.alert_type.includes('DOWN') || alert.alert_type.includes('BELOW') || alert.alert_type === 'BTFD';
                return (
                  <tr key={alert.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>
                      {new Date(alert.triggered_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>
                      <Link href={`/watchlist/${alert.ticker}`} style={{ color: 'var(--foreground)', textDecoration: 'underline' }}>
                        {alert.ticker}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        background: isBearish ? 'rgba(255,51,102,0.1)' : 'rgba(0,255,153,0.1)',
                        color: isBearish ? 'var(--danger)' : 'var(--success)'
                      }}>
                        {alert.alert_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--foreground)' }}>
                      ${alert.price_at_alert?.toFixed(2) || '-'}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: alert.pct_change < 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {alert.pct_change > 0 ? '+' : ''}{alert.pct_change?.toFixed(2) || '-'}%
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: alert.alert_performance?.[0]?.forward_3d > 0 ? 'var(--success)' : alert.alert_performance?.[0]?.forward_3d < 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {alert.alert_performance?.[0]?.forward_3d ? `${alert.alert_performance[0].forward_3d > 0 ? '+' : ''}${alert.alert_performance[0].forward_3d.toFixed(1)}%` : '-'}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: alert.alert_performance?.[0]?.forward_7d > 0 ? 'var(--success)' : alert.alert_performance?.[0]?.forward_7d < 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {alert.alert_performance?.[0]?.forward_7d ? `${alert.alert_performance[0].forward_7d > 0 ? '+' : ''}${alert.alert_performance[0].forward_7d.toFixed(1)}%` : '-'}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: alert.alert_performance?.[0]?.forward_30d > 0 ? 'var(--success)' : alert.alert_performance?.[0]?.forward_30d < 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {alert.alert_performance?.[0]?.forward_30d ? `${alert.alert_performance[0].forward_30d > 0 ? '+' : ''}${alert.alert_performance[0].forward_30d.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
