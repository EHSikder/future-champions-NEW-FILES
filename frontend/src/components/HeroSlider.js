'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
    </svg>
  );
}

// ── Slide image filenames ──────────────────────────────────
// Desktop: 1783 x 592   |   Mobile: 579 x 593
// Add as many slides as you want — just extend this array.
const SLIDES = [
  { desktop: '/images/hero-desktop-1.jpg', mobile: '/images/hero-mobile-1.jpg' },
  { desktop: '/images/hero-desktop-2.jpg', mobile: '/images/hero-mobile-2.jpg' },
];

const SLIDE_DURATION = 5000; // ms between auto-advance

export default function HeroSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (SLIDES.length <= 1) return;
    const id = setInterval(() => {
      setActive(prev => (prev + 1) % SLIDES.length);
    }, SLIDE_DURATION);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="hero-image-section" style={{
      position: 'relative',
      width: '100%',
      height: '592px',
      overflow: 'hidden',
      background: '#000',
    }}>
      {SLIDES.map((slide, i) => (
        <div
          key={i}
          className="hero-slide"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: i === active ? 1 : 0,
            transition: 'opacity 1s ease-in-out',
            zIndex: 0,
          }}
        >
          <img
            src={slide.desktop}
            alt=""
            className="hero-image-desktop"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <img
            src={slide.mobile}
            alt=""
            className="hero-image-mobile"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ))}

      {/* Action Buttons only — no overlay, no text */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: 'clamp(24px, 6vw, 56px)',
      }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
            padding: '1rem 2rem',
            background: 'linear-gradient(135deg, #0096FF 0%, #7800C8 100%)',
            color: '#fff', textDecoration: 'none', borderRadius: '0.5rem',
            fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.95rem',
            textTransform: 'uppercase', transition: 'all 0.3s ease',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 0 20px rgba(0, 150, 255, 0.5)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 150, 255, 0.8)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 150, 255, 0.5)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          >
            PREDICT NOW
            <ArrowIcon />
          </Link>

          <Link href="/leaderboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
            padding: '1rem 2rem',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff', textDecoration: 'none', borderRadius: '0.5rem',
            fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.95rem',
            textTransform: 'uppercase', transition: 'all 0.3s ease',
            border: '1px solid rgba(255, 255, 255, 0.2)', cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
          >
            <TrophyIcon />
            VIEW LEADERBOARD
          </Link>
        </div>
      </div>

      {/* Slide indicator dots */}
      {SLIDES.length > 1 && (
        <div style={{
          position: 'absolute', top: 'clamp(16px, 4vw, 32px)', left: '50%', transform: 'translateX(-50%)',
          zIndex: 2, display: 'flex', gap: 8,
        }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === active ? 24 : 8,
                height: 8,
                borderRadius: 4,
                border: 'none',
                background: i === active ? 'var(--color-electric-blue)' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
