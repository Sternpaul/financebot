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
      </div>
    </main>
  );
}
