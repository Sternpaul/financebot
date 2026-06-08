'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <span className="text-gradient">FinanceBot</span>
      </div>
      <div className={styles.navLinks}>
        <Link href="/" className={`${styles.navItem} ${pathname === '/' ? styles.active : ''}`}>
          Feed
        </Link>
        <Link href="/portfolio" className={`${styles.navItem} ${pathname === '/portfolio' ? styles.active : ''}`}>
          Portfolio
        </Link>
        <Link href="/settings" className={`${styles.navItem} ${pathname === '/settings' ? styles.active : ''}`}>
          Settings
        </Link>
      </div>
    </nav>
  );
}
