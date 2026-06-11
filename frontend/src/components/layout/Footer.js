'use client';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="footer">
      <div className="container" style={{ padding: '4rem var(--space-6) 2rem' }}>
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <h3>FUTURE CHAMPIONS</h3>
            <p>
              Predict FIFA World Cup match results, earn points every round, unlock bonus MCQ challenges,
              and compete for $1,000 and exclusive vouchers in the Future Champions Prediction Challenge.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
              {/* Social icons / decorative elements */}
              {['⚽', '🏆', '🎯'].map((icon, i) => (
                <div key={i} style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-3)',
                  border: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem',
                }}>{icon}</div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="footer-links">
            <h4>{t('footer_nav_title')}</h4>
            <Link href="/">{t('footer_nav_home')}</Link>
            <Link href="/matches">Matches</Link>
            <Link href="/leaderboard">{t('footer_nav_leaderboard')}</Link>
            <Link href="/login">{t('footer_nav_login')}</Link>
          </div>

          {/* Legal */}
          <div className="footer-links">
            <h4>{t('footer_legal_title')}</h4>
            <Link href="/terms">{t('footer_terms')}</Link>
            <Link href="/privacy">{t('footer_privacy')}</Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom" style={{ marginTop: 'var(--space-8)' }}>
          <span>© {new Date().getFullYear()} Future Champions. All rights reserved.</span>
          <span style={{ color: 'var(--color-text-dim)' }}>Powered by Future Champions</span>
        </div>
      </div>
    </footer>
  );
}
