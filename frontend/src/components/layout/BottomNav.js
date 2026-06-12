'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

function HomeIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-electric-blue)' : 'currentColor'} strokeWidth="2" width="22" height="22">
      <path d="M3 11.5L12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PredictIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-electric-blue)' : 'currentColor'} strokeWidth="2" width="22" height="22">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="5"/>
      <circle cx="12" cy="12" r="1" fill={active ? 'var(--color-electric-blue)' : 'currentColor'}/>
    </svg>
  );
}

function LeaderboardIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-electric-blue)' : 'currentColor'} strokeWidth="2" width="22" height="22">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 6H4a1 1 0 0 0-1 1c0 2.5 1.5 4 4 4M17 6h3a1 1 0 0 1 1 1c0 2.5-1.5 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ProfileIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-electric-blue)' : 'currentColor'} strokeWidth="2" width="22" height="22">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const HIDDEN_PATHS = ['/login', '/signup', '/verify', '/complete-profile', '/admin-panel'];
  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null;

  const leftItems = [
    { href: '/',        label: t('nav_home')    || 'Home',    Icon: HomeIcon },
    { href: '/matches', label: t('nav_matches') || 'Predict', Icon: PredictIcon },
  ];

  const rightItems = [
    { href: '/leaderboard', label: t('nav_leaderboard') || 'Leaders', Icon: LeaderboardIcon },
    { href: '/profile',     label: t('nav_profile')     || 'Profile', Icon: ProfileIcon },
  ];

  const isActive = (href) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <nav className="bottom-nav">
      {leftItems.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={`bottom-nav-item ${isActive(href) ? 'active' : ''}`}>
          <Icon active={isActive(href)} />
          <span>{label}</span>
        </Link>
      ))}

      {/* ── MCQ center icon — image placeholder ──────────────── */}
      <Link
        href="/mcq"
        className={`bottom-nav-item bottom-nav-mcq ${isActive('/mcq') ? 'active' : ''}`}
      >
        <img
          src="/images/mcq-icon.png"
          alt="MCQ"
          className="bottom-nav-mcq-icon"
          width="22"
          height="22"
        />
        <span>{t('nav_mcq') || 'MCQ'}</span>
      </Link>

      {rightItems.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={`bottom-nav-item ${isActive(href) ? 'active' : ''}`}>
          <Icon active={isActive(href)} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
