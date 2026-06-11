// ── UPDATED HERO SECTION FOR YOUR page.js ──
// Replace lines 80-154 in your page.js with this code

      {/* ── HERO: Full-screen video background ─────────────── */}
      <section className="hero-video-section" style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: '#000',
      }}>
        {/* Video Background - FIXED */}
        <video
          className="hero-video-bg"
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        >
          <source src="/videos/hero-main.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Dark Overlay for text readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 100%)',
          zIndex: 1,
          pointerEvents: 'none',
        }} />

        {/* Hero Content - Centered */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          maxWidth: '900px',
          width: '90%',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
        }}>
          {/* Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            letterSpacing: '0.15em',
            color: '#0096FF',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            <span style={{
              display: 'inline-block',
              width: '20px',
              height: '1px',
              background: '#0096FF',
            }} />
            The Future Awaits
            <span style={{
              display: 'inline-block',
              width: '20px',
              height: '1px',
              background: '#0096FF',
            }} />
          </div>

          {/* Main Title - Split into 2 lines */}
          <h1 style={{
            fontFamily: 'var(--font-hero)',
            fontSize: 'clamp(2.5rem, 8vw, 5.5rem)',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #0096FF 0%, #7800C8 50%, #FF6400 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              The Future is Closer
            </div>
            <div style={{
              color: '#fff',
              marginTop: '0.5rem',
            }}>
              Than You Think
            </div>
          </h1>

          {/* Subtitle */}
          <div style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
            fontWeight: 600,
            letterSpacing: '0.1em',
            color: '#FFD700',
            textTransform: 'uppercase',
          }}>
            WIN $1,000
          </div>

          {/* Description */}
          <p style={{
            fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)',
            color: 'rgba(255, 255, 255, 0.8)',
            lineHeight: 1.6,
            maxWidth: '600px',
            margin: 0,
          }}>
            Predict match results, earn points, climb the leaderboard &amp; become the ultimate champion.
          </p>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: '1rem',
          }}>
            <Link href="/login" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, #0096FF 0%, #7800C8 100%)',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              fontSize: '0.95rem',
              textTransform: 'uppercase',
              transition: 'all 0.3s ease',
              border: 'none',
              cursor: 'pointer',
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 2rem',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              fontSize: '0.95rem',
              textTransform: 'uppercase',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
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

        {/* Bottom scroll indicator */}
        <div style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
          opacity: 0.6,
        }}>
          <span style={{
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            color: '#fff',
            textTransform: 'uppercase',
          }}>
            Scroll
          </span>
          <div style={{
            width: '24px',
            height: '40px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '6px 0',
          }}>
            <div style={{
              width: '3px',
              height: '8px',
              borderRadius: '2px',
              background: '#0096FF',
              animation: 'float 1.5s ease-in-out infinite',
            }} />
          </div>
        </div>
      </section>
