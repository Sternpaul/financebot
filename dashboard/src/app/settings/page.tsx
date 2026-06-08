import { logout } from '@/app/login/actions';

export default function Settings() {
  return (
    <main className="page-container animate-fade-in">
      <h1 className="header-title">Bot <span className="text-gradient">Settings</span></h1>
      <div className="glass-panel">
        <p style={{ color: 'var(--text-secondary)' }}>
          To change configurations like Discord Tokens, API Keys, or Alert Thresholds, please edit the <code>.env</code> file directly on your Debian host and restart the bot containers.
        </p>
        <br/>
        <p style={{ color: 'var(--text-secondary)' }}>
          GUI-based settings overrides and database syncing are coming in a future update!
        </p>
        
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
