import React, { useMemo } from 'react';
import { MonoIcon, Avatar } from '../lib/sprites.jsx';
import { colorOf, formatEuro, titleShadow } from '../lib/theme.js';
import { computeGameStats } from '../lib/data.js';
import { sfx } from '../lib/sound.js';

// End-of-trip celebration. Shown full-screen the first time the game is over and
// re-openable from HQ (the EAT button is swapped for a "view results" card once
// the chain is frozen). Confetti + a big congrats for the kebab champion, plus a
// grid of group stats and fun superlatives. Dismissible so the chain/log stay
// explorable underneath.
export function WinnerScreen({ theme, feed, crew, groupScore, onClose }) {
  const T = theme;
  const s = useMemo(() => computeGameStats(feed, crew), [feed, crew]);
  const { champions } = s;
  const tie = champions.length > 1;

  // A spray of pixel confetti — stable for the life of the overlay.
  const confetti = useMemo(() => {
    const colors = [T.gold, T.red, T.green, T.blue, T.accent];
    return Array.from({ length: 56 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 6 + Math.round(Math.random() * 8),
      color: colors[i % colors.length],
      delay: -(Math.random() * 5),
      dur: 3.6 + Math.random() * 3.2,
      square: Math.random() > 0.4,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [T.gold, T.red, T.green, T.blue, T.accent]);

  const stat = (icon, val, lbl, col) => (
    <div style={{ background: T.surf, border: '2px solid ' + T.line, boxShadow: `0 4px 0 ${T.bg0}`, padding: '12px 10px' }}>
      <MonoIcon name={icon} size={16} color={col} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: col, marginTop: 9, wordBreak: 'break-word' }}>{val}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 6, color: T.muted, marginTop: 6, letterSpacing: 0.5 }}>{lbl}</div>
    </div>
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 160,
        background: `linear-gradient(${T.bg1}, ${T.bg0})`,
        overflowY: 'auto',
        animation: 'fadeIn .3s ease-out',
      }}
    >
      {/* confetti layer */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {confetti.map(c => (
          <div
            key={c.id}
            style={{
              position: 'absolute',
              top: 0,
              left: c.left + '%',
              width: c.size,
              height: c.square ? c.size : Math.round(c.size * 0.55),
              background: c.color,
              borderRadius: c.square ? 0 : 1,
              animation: `confettiFall ${c.dur}s linear ${c.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* close */}
      <button
        onClick={() => { sfx.pop(); onClose(); }}
        title="Close"
        style={{
          position: 'absolute',
          top: 'calc(10px + var(--safe-top))',
          right: 12,
          zIndex: 3,
          background: 'rgba(0,0,0,0.5)',
          border: '2px solid ' + T.muted,
          padding: '6px 8px',
          cursor: 'pointer',
          boxShadow: `0 3px 0 ${T.bg0}`,
        }}
      >
        <MonoIcon name="cross" size={12} color={T.muted} />
      </button>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 'calc(34px + var(--safe-top)) 18px calc(28px + var(--safe-bottom))',
          textAlign: 'center',
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: T.red, letterSpacing: 2 }}>
          ★ TRIP COMPLETE ★
        </div>

        <div style={{ marginTop: 16, animation: 'trophyBob 2s ease-in-out infinite' }}>
          <MonoIcon name="crown" size={64} color={T.gold} />
        </div>

        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: T.gold,
            marginTop: 14,
            letterSpacing: 1,
            textShadow: titleShadow(T, 3),
          }}
        >
          {tie ? 'CO-CHAMPS!' : 'CHAMPION!'}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 17, color: T.muted, marginTop: 10, letterSpacing: 1 }}>
          {s.total > 0 ? 'MOST KEBABS ON THE TRIP' : 'THE BOARD STAYED EMPTY'}
        </div>

        {/* champion card */}
        {champions.length > 0 && (
          <div
            style={{
              width: '100%',
              maxWidth: 360,
              marginTop: 20,
              padding: '20px 16px',
              background: `repeating-linear-gradient(135deg, ${T.surf}, ${T.surf} 10px, ${T.surf2} 10px, ${T.surf2} 20px)`,
              border: '3px solid ' + T.gold,
              boxShadow: `0 6px 0 ${T.bg0}`,
              animation: 'winnerPop .5s steps(4) both',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              {champions.map(c => (
                <div key={c.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
                  <div style={{ animation: 'bob 1.8s ease-in-out infinite' }}>
                    <Avatar n={c.avatar} size={tie ? 76 : 104} theme={T} borderColor={T.gold} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: tie ? 12 : 16, color: T.text }}>
                    {c.name}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <MonoIcon name="coin" size={22} color={T.gold} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: T.gold, textShadow: `2px 2px 0 ${T.bg0}` }}>
                {s.maxK}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: T.muted }}>KEBABS</span>
            </div>
          </div>
        )}

        {/* group stats */}
        <div style={{ width: '100%', maxWidth: 360, marginTop: 26, textAlign: 'left' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: T.gold, marginBottom: 12 }}>
            ▶ THE FINAL TALLY
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {stat('coin', groupScore, 'POD SCORE', T.gold)}
            {stat('flame', s.daysEaten, 'DAYS EATEN', T.red)}
            {stat('star', s.avgRating.toFixed(1), 'AVG RATING', T.blue)}
            {stat('pin', s.cities, 'CITIES', T.green)}
            {stat('castle', s.busiestN || 0, 'BEST DAY', T.gold)}
            {stat('heart', s.topMeat ? s.topMeat.toUpperCase() : '—', 'TOP MEAT', T.red)}
          </div>

          {/* fun callouts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {s.total > 0 && (
              <Callout T={T} icon="coin" col={T.gold} title="POD SPEND"
                body={`${formatEuro(s.totalSpent)} on ${s.total} kebab${s.total === 1 ? '' : 's'} across the trip.`} />
            )}
            {s.priciest && s.priciest.price > 0 && (
              <Callout T={T} icon="bolt" col={T.red} title="BIGGEST SPLURGE"
                body={`${formatEuro(s.priciest.price)} — ${s.priciest.player} at ${s.priciest.shop || 'a mystery shop'}.`} />
            )}
            {s.topRated && (
              <Callout T={T} icon="star" col={T.blue} title="TOP RATED"
                body={`${s.topRated.rating}★ — ${s.topRated.shop || 'Mystery Kebab'}${s.topRated.city ? `, ${s.topRated.city}` : ''}.`} />
            )}
            {s.busiestLabel && (
              <Callout T={T} icon="flame" col={T.green} title="BUSIEST DAY"
                body={`${s.busiestN} kebab${s.busiestN === 1 ? '' : 's'} on ${s.busiestLabel}.`} />
            )}
          </div>
        </div>

        <button
          onClick={() => { sfx.success(); onClose(); }}
          style={{
            width: '100%',
            maxWidth: 360,
            marginTop: 28,
            border: 'none',
            background: T.green,
            color: T.bg0,
            padding: '16px',
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            cursor: 'pointer',
            boxShadow: `0 5px 0 ${T.bg0}`,
          }}
        >
          EXPLORE THE CHAIN →
        </button>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: T.muted, marginTop: 14, opacity: 0.85 }}>
          The board is frozen — but the memories live on.
        </div>
      </div>
    </div>
  );
}

function Callout({ T, icon, col, title, body }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 11,
        padding: '11px 12px',
        background: T.surf,
        border: '2px solid ' + T.line,
        boxShadow: `0 4px 0 ${T.bg0}`,
      }}
    >
      <MonoIcon name={icon} size={18} color={col} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 7, color: col, letterSpacing: 0.5 }}>{title}</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: T.text, marginTop: 5, lineHeight: 1.35 }}>{body}</div>
      </div>
    </div>
  );
}
