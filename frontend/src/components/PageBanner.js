'use client';

// Shared image banner for Leaderboard / Matches / Profile pages.
// One desktop image + one mobile image, both 1512 x 592.
// Swapped via CSS at the 768px breakpoint.
export default function PageBanner({ title, subtitle, icon, right }) {
  return (
    <div className="page-banner">
      <img src="/images/page-banner-desktop.jpg" alt="" className="page-banner-img page-banner-desktop" />
      <img src="/images/page-banner-mobile.jpg"  alt="" className="page-banner-img page-banner-mobile" />

      {(title || subtitle || right) && (
        <div className="page-banner-overlay" style={{ justifyContent: right ? 'space-between' : 'flex-start' }}>
          <div>
            {title && (
              <div className="page-banner-title">
                {icon ? `${icon} ` : ''}{title}
              </div>
            )}
            {subtitle && (
              <div className="page-banner-subtitle">{subtitle}</div>
            )}
          </div>
          {right && <div>{right}</div>}
        </div>
      )}
    </div>
  );
}
