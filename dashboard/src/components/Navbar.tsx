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
    <div className={styles.navbarWrapper}>
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
        </div>

        <div className={styles.controls}>
          <button onClick={toggleCurrency} className={styles.controlButton} aria-label="Toggle Currency">
            <span className={styles.currencyIcon}>{currency === 'USD' ? '$' : '€'}</span>
          </button>
          
          <button onClick={toggleTheme} className={styles.controlButton} aria-label="Toggle Theme">
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}
