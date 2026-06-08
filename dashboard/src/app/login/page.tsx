'use client';

import { useActionState } from 'react';
import { authenticate } from './actions';
import styles from './login.module.css';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(authenticate, undefined);

  return (
    <main className={styles.loginContainer}>
      <div className={`glass-panel animate-fade-in ${styles.loginBox}`}>
        <h1 className="header-title" style={{ textAlign: 'center', marginBottom: '20px' }}>
          Finance<span className="text-gradient">Bot</span>
        </h1>
        
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '30px' }}>
          Please enter your dashboard password to continue.
        </p>

        <form action={formAction} className={styles.form}>
          <input 
            type="password" 
            name="password" 
            placeholder="Password..." 
            className={styles.input}
            required
            autoFocus
          />
          
          {state?.error && (
            <p className={styles.error}>{state.error}</p>
          )}

          <button type="submit" className={styles.button} disabled={isPending}>
            {isPending ? 'Unlocking...' : 'Unlock Dashboard'}
          </button>
        </form>
      </div>
    </main>
  );
}
