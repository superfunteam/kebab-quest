import React from 'react';
import { PixelStars, Avatar } from '../lib/sprites.jsx';
import { colorOf, formatEuro, titleShadow } from '../lib/theme.js';

export function LogScreen({ theme, feed, crew }) {
  const T = theme;
  const cc = (p) => {
    const m = crew.find(c => c.name === p);
    return m ? colorOf(T, m.color) : T.muted;
  };
  const total = feed.reduce((s, f) => s + (f.price || 0), 0);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '8px 16px 0' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: T.text, textShadow: titleShadow(T) }}>
        KEBAB LOG
      </div>
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          color: T.muted,
          marginTop: 8,
          marginBottom: 16,
          letterSpacing: 1,
        }}
      >
        {feed.length} LOGGED · {formatEuro(total)} SPENT
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, paddingBottom: 12 }}>
        {feed.map((f) => (
          <div
            key={f.id}
            style={{
              display: 'flex',
              gap: 11,
              background: T.surf,
              border: '2px solid ' + T.line,
              boxShadow: `0 4px 0 ${T.bg0}`,
              padding: 11,
            }}
          >
            <Avatar n={f.avatar} size={54} theme={T} borderColor={cc(f.player)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 9, height: 9, background: cc(f.player), flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.player}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: T.muted,
                    marginLeft: 'auto',
                    flexShrink: 0,
                  }}
                >
                  {f.when}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                <PixelStars value={f.rating} size={11} color={T.gold} dim={T.surf2} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: T.muted, whiteSpace: 'nowrap' }}>
                  {f.city}{f.cc ? ' · ' + f.cc : ''}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {f.meat && (
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      fontWeight: 700,
                      color: T.bg0,
                      background: cc(f.player),
                      padding: '2px 7px',
                    }}
                  >
                    {f.meat.toUpperCase()}
                  </span>
                )}
                {f.price > 0 && (
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: T.text }}>{formatEuro(f.price)}</span>
                )}
                {f.pending && (
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 7, color: T.muted, marginLeft: 'auto' }}>
                    SYNCING…
                  </span>
                )}
              </div>
              {f.note && (
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: T.muted, marginTop: 8, lineHeight: 1.35 }}>
                  "{f.note}"
                </div>
              )}
            </div>
          </div>
        ))}
        {feed.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: T.muted, fontFamily: 'var(--font-body)', fontSize: 16 }}>
            No kebabs logged yet. Smash the EAT button on HQ.
          </div>
        )}
      </div>
    </div>
  );
}
