'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export function NotificationBanner() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      Notification.permission === 'granted' ||
      Notification.permission === 'denied'
    ) return;
    setShow(true);
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setShow(false); return; }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) { setShow(false); return; }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      await api.post('/api/notifications/subscribe', { subscription: sub });
      setShow(false);
    } catch {
      setShow(false);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div style={{
      background: 'rgba(212,175,55,0.1)',
      border: '1px solid rgba(212,175,55,0.3)',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      flexWrap: 'wrap',
    }}>
      <p style={{ margin: 0, fontSize: '14px' }}>
        🔔 Enable notifications to get match reminders
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleEnable}
          disabled={loading}
          style={{ fontSize: '13px', padding: '6px 14px', cursor: 'pointer',
            background: 'var(--color-golden-yellow, #d4af37)', border: 'none',
            borderRadius: '6px', fontWeight: 600 }}
        >
          {loading ? 'Enabling…' : 'Enable'}
        </button>
        <button
          onClick={() => setShow(false)}
          style={{ fontSize: '13px', padding: '6px 10px', cursor: 'pointer',
            background: 'transparent', border: '1px solid #555', borderRadius: '6px' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default NotificationBanner;
