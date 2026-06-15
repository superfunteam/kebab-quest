import React from 'react';
import { MonoIcon, Avatar } from '../lib/sprites.jsx';
import { colorOf, titleShadow } from '../lib/theme.js';
import { rankCrew, placeOf } from '../lib/ranking.js';

export function CrewScreen({ theme, crew, feed, groupScore, todayCount }) {
  const T = theme;
  // Ties share a place (decided by kebab count alone) with the current player
  // floated to the top of their tie group — see lib/ranking.js.
  const ranked = rankCrew(crew);
  const maxK = Math.max(1, ...crew.map(c => c.kebabs));
  // The crowned player (longest *active* streak). crewView only sets `king` once
  // someone actually has a streak, so the callout stays hidden on day one when
  // the whole pod is still at zero — no bogus "0 days" king.
  const king = crew.find(c => c.king);
  const allRatings = feed.filter(f => f.rating).map(f => f.rating);
  const avg = allRatings.length ? (allRatings.reduce((s, r) => s + r, 0) / allRatings.length) : 0;

  const stat = (icon, val, lbl, col) => (
    <div
      style={{
        flex: 1,
        background: T.surf,
        border: '2px solid ' + T.line,
        padding: '11px 10px',
      }}
    >
      <MonoIcon name={icon} size={16} color={col} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: col, marginTop: 8 }}>{val}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 6, color: T.muted, marginTop: 5 }}>{lbl}</div>
    </div>
  );

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '8px 16px 0' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: T.text, textShadow: titleShadow(T) }}>
        THE POD
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
        {crew.length} PLAYERS · {groupScore} KEBABS DOWN
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {stat('coin', groupScore, 'POD SCORE', T.gold)}
        {stat('flame', todayCount, 'EATEN TODAY', T.green)}
        {stat('star', avg.toFixed(1), 'AVG RATING', T.blue)}
      </div>

      {/* leaderboard */}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: T.gold, marginBottom: 12 }}>
        ▶ LEADERBOARD
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
        {ranked.map((p, i) => (
          <div
            key={p.name}
            style={{
              display: 'flex',
              alignItems: 'stretch',
              background: p.you ? T.surf2 : T.surf,
              border: '2px solid ' + (p.you ? T.red : T.line),
              boxShadow: `0 4px 0 ${T.bg0}`,
              overflow: 'hidden',
            }}
          >
            <div style={{ flex: 1, minWidth: 0, padding: '11px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 13,
                    color: placeOf(ranked, i) === 1 ? T.gold : T.muted,
                    width: 22,
                  }}
                >
                  {placeOf(ranked, i)}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 11,
                    color: T.text,
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    minWidth: 0,
                    overflow: 'hidden',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  {(placeOf(ranked, i) === 1 || p.king) && <MonoIcon name="crown" size={12} color={T.gold} />}
                  {p.you && <span style={{ color: T.red, fontSize: 7 }}>P1</span>}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <MonoIcon name="flame" size={13} color={T.gold} />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: T.gold }}>{p.streak}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    height: 14,
                    background: T.bg0,
                    border: '2px solid ' + T.line,
                    padding: 2,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: (p.kebabs / maxK * 100) + '%',
                      background: colorOf(T, p.color),
                      transition: 'width .5s steps(8)',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 11,
                    color: colorOf(T, p.color),
                    width: 24,
                    textAlign: 'right',
                  }}
                >
                  {p.kebabs}
                </span>
              </div>
            </div>
            {/* Full-height avatar cap on the right — the faces are the fun part. */}
            <div style={{ flexShrink: 0, alignSelf: 'stretch', display: 'flex', width: 72 }}>
              <Avatar
                n={p.avatar}
                size={72}
                theme={T}
                borderColor={colorOf(T, p.color)}
                style={{ width: 72, height: '100%', borderWidth: 0, borderLeft: '2px solid ' + colorOf(T, p.color) }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* streak king callout */}
      {king && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '14px 14px 16px',
            marginBottom: 16,
            background: `repeating-linear-gradient(135deg, ${T.surf}, ${T.surf} 10px, ${T.surf2} 10px, ${T.surf2} 20px)`,
            border: '2px solid ' + T.gold,
            boxShadow: `0 4px 0 ${T.bg0}`,
          }}
        >
          <MonoIcon name="crown" size={24} color={T.gold} style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: T.gold }}>STREAK KING</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: T.text, marginTop: 5, lineHeight: 1.35 }}>
              {king.name} — {king.streak} days, one a day, no mercy.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
