import { logout } from '@/app/login/actions';
import SourcesManager from '@/components/SourcesManager';

import GlobalAlerts from '@/components/GlobalAlerts';
import AlertHistory from '@/components/AlertHistory';
import DiscordTestButton from '@/components/DiscordTestButton';

export default function Settings() {
  return (
    <main className="page-container animate-fade-in">
      <h1 className="header-title">Bot <span className="text-gradient">Settings</span></h1>
      <div className="glass-panel">
        <p style={{ color: 'var(--text-secondary)' }}>
          To change configurations like Discord Tokens, API Keys, or Alert Thresholds, please edit the <code>.env</code> file directly on your Debian host and restart the bot containers.
        </p>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginTop: 0, color: 'var(--foreground)' }}>Integrations</h3>
          <DiscordTestButton />
        </div>

        <GlobalAlerts />
        
        <AlertHistory />
        
        <SourcesManager />
        
        <form action={logout} style={{ marginTop: '30px', borderTop: '1px solid var(--glass-border)', paddingTop: '30px' }}>
          <button type="submit" style={{
            background: 'rgba(255, 51, 102, 0.1)',
            color: '#ff3366',
            border: '1px solid #ff3366',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}>
            Lock Dashboard
          </button>
        </form>
      </div>
    </main>
  );
}
