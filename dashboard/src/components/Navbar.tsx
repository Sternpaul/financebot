'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';
import { useAppContext } from './AppContext';

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme, currency, toggleCurrency } = useAppContext();

  if (pathname === '/login') {
    return null;
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <span className="text-gradient">FinanceBot</span>
      </div>
      <div className={styles.navLinks}>
        <Link href="/" className={`${styles.navItem} ${pathname === '/' ? styles.active : ''}`}>
          Feed
        </Link>
        <Link href="/watchlist" className={`${styles.navItem} ${pathname.startsWith('/watchlist') ? styles.active : ''}`}>
          Watchlist
        </Link>
        <Link href="/portfolio" className={`${styles.navItem} ${pathname === '/portfolio' ? styles.active : ''}`}>
          Portfolio
        </Link>
        <Link href="/settings" className={`${styles.navItem} ${pathname === '/settings' ? styles.active : ''}`}>
          Settings
        </Link>
        <div style={{ display: 'flex', gap: '10px', marginLeft: '1rem', borderLeft: '1px solid #333', paddingLeft: '1rem' }}>
            <button onClick={toggleCurrency} style={{ background: 'transparent', border: '1px solid #333', borderRadius: '4px', color: 'var(--foreground)', cursor: 'pointer', padding: '4px 8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              {currency}
            </button>
            <button onClick={toggleTheme} style={{ background: 'transparent', border: '1px solid #333', borderRadius: '4px', color: 'var(--foreground)', cursor: 'pointer', padding: '4px 8px', fontSize: '0.8rem' }}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
        </div>
      </div>
    </nav>
  );
}
