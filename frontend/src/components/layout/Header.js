'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
      <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
    </svg>
  );
}

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t, locale } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="header">
      <div className="header-inner">
        {/* Logo */}
        <Link href="/" className="header-logo">
          <img
            src="/images/fc-logo.png"
            alt="Future Champions"
            width="120"
            height="40"
            style={{ objectFit: 'contain' }}
            onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'block'; }}
          />
          <span className="header-logo-text" style={{ display: 'none' }}>FUTURE CHAMPIONS</span>
        </Link>

        {/* Desktop nav */}
        <nav className="header-nav">
          <Link href="/">{t('nav_home')}</Link>
          <Link href="/matches">{t('nav_matches')}</Link>
          <Link href="/leaderboard">{t('nav_leaderboard')}</Link>
        </nav>

        {/* Actions */}
        <div className="header-actions">
          {isAuthenticated ? (
            <>
              <Link href="/profile" style={{
                fontFamily: 'var(--font-body)', fontSize: 'var(--fs-sm)',
                color: 'var(--color-cyan)', fontWeight: 600,
                border: '1px solid rgba(0,229,255,0.3)',
                padding: '6px 14px', borderRadius: 'var(--radius-md)',
                transition: 'all 0.2s', textDecoration: 'none'
              }}>
                {user?.full_name?.split(' ')[0]}
              </Link>
              <button
                className="btn btn-ghost btn-sm"
                onClick={logout}
                style={{ color: 'var(--color-text-muted)' }}
              >
                {t('nav_sign_out')}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-text-muted)' }}>
                {t('nav_sign_in')}
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                SIGN UP
              </Link>
            </>
          )}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="mobile-nav-overlay open"
            onClick={() => setMobileOpen(false)}
            style={{ display: 'block' }}
          />
          <div
            className="mobile-nav open"
            style={{ display: 'flex' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
              <span className="header-logo-text" style={{ display: 'block', fontSize: '1.4rem' }}>FUTURE CHAMPIONS</span>
              <button
                className="mobile-menu-btn"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>
            <Link href="/" onClick={() => setMobileOpen(false)}>{t('nav_home')}</Link>
            <Link href="/matches" onClick={() => setMobileOpen(false)}>{t('nav_matches')}</Link>
            <Link href="/leaderboard" onClick={() => setMobileOpen(false)}>{t('nav_leaderboard')}</Link>
            {isAuthenticated ? (
              <>
                <Link href="/profile" onClick={() => setMobileOpen(false)} style={{ color: 'var(--color-cyan)' }}>
                  {user?.full_name}
                </Link>
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  style={{
                    padding: '0.75rem 0', color: 'var(--color-error)',
                    background: 'none', border: 'none', textAlign: 'left',
                    cursor: 'pointer', fontSize: '1.125rem', fontFamily: 'var(--font-heading)',
                    letterSpacing: '0.08em', textTransform: 'uppercase'
                  }}
                >
                  {t('nav_sign_out')}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)}>{t('nav_sign_in')}</Link>
                <Link href="/signup" onClick={() => setMobileOpen(false)} style={{ color: 'var(--color-cyan)', fontWeight: 'bold' }}>
                  SIGN UP
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </header>
  );
}
