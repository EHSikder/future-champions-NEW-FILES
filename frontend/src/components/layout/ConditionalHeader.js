'use client';
import { usePathname } from 'next/navigation';
import Header from './Header';

const HIDDEN_PATHS = ['/login', '/signup', '/verify', '/complete-profile', '/admin-panel'];

export default function ConditionalHeader() {
  const pathname = usePathname();
  const hide = HIDDEN_PATHS.some(p => pathname.startsWith(p));
  if (hide) return null;
  return <Header />;
}
