import { supabase } from '@/lib/supabase';
import styles from './portfolio.module.css';

export const revalidate = 0; // Always fetch live

export default async function Portfolio() {
  const { data: holdings, error } = await supabase
    .from('holdings')
    .select('*');

  return (
    <main className="page-container animate-fade-in">
      <h1 className="header-title">My <span className="text-gradient">Portfolio</span></h1>
      
      <div className={styles.portfolioGrid}>
        {error && <p>Error loading portfolio: {error.message}</p>}
        {(!holdings || holdings.length === 0) && !error && (
          <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
            <p>Your portfolio is currently empty in the database.</p>
          </div>
        )}
        
        {holdings?.map((asset) => (
          <div key={asset.id} className="glass-panel">
            <div className={styles.assetHeader}>
              <span className={styles.ticker}>{asset.ticker}</span>
              <span className={styles.balance}>{asset.quantity} shares</span>
            </div>
            <div className={styles.pnl}>
              <span>Avg Entry Price</span>
              <span>${asset.average_price?.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
