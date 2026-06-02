import React from 'react';
import { KebabSprite, MonoIcon, PixelStars, Avatar } from '../lib/sprites.jsx';
import { colorOf, titleShadow } from '../lib/theme.js';

// How many unclaimed "upcoming" nodes to show above the latest kebab, like the
// locked levels ahead of you on a video-game world map.
const LOCKED_AHEAD = 3;

export function ChainScreen({ theme, voice, feed, crew, onSelect }) {
  const T = theme;
  const V = voice;
  const pColor = (p) => {
    const m = crew.find(c => c.name === p);
    return m ? colorOf(T, m.color) : T.muted;
  };

  const STEP = 96;
  const AMP = 27;
  const TOP = 30;
  const N = feed.length;
  const totalRows = LOCKED_AHEAD + N;

  // Geometry is keyed off "row" (0 = topmost = furthest-future locked node).
  // Real kebab feed[i] lives at row LOCKED_AHEAD + i (so feed[0] sits right
  // below the locked slots).
  const xOfRow = (r) => 50 + Math.sin(r * 0.95) * AMP;
  const yOfRow = (r) => TOP + r * STEP;
  const rowOfFeed = (i) => LOCKED_AHEAD + i;
  const H = TOP + Math.max(0, totalRows - 1) * STEP + 120;

  // Build the connector segments between every consecutive pair of rows.
  const connectors = [];
  for (let r = 0; r < totalRows - 1; r++) {
    const upperReal = r - LOCKED_AHEAD; // feed index of the upper node if real
    const lockedSeg = r < LOCKED_AHEAD; // either endpoint locked → dim segment
    connectors.push({
      key: r,
      x1: xOfRow(r), y1: yOfRow(r),
      x2: xOfRow(r + 1), y2: yOfRow(r + 1),
      color: lockedSeg ? T.line : pColor(feed[upperReal]?.player),
      dim: lockedSeg,
    });
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: `linear-gradient(${T.bg1}, ${T.bg0})` }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 6,
          background: T.bg1,
          borderBottom: '2px solid ' + T.line,
          padding: '8px 18px 10px',
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: T.text, textShadow: titleShadow(T) }}>
          {V.chainTitle}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: T.muted, marginTop: 6, letterSpacing: 1 }}>
          {N} KEBABS · {V.chainSub}
        </div>
      </div>

      <div style={{ position: 'relative', height: H }}>
        {/* connectors */}
        {totalRows > 1 && (
          <svg
            width="100%"
            height={H}
            viewBox={`0 0 100 ${H}`}
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0 }}
          >
            {connectors.map(c => (
              <line
                key={c.key}
                x1={c.x1}
                y1={c.y1}
                x2={c.x2}
                y2={c.y2}
                stroke={c.color}
                strokeWidth={2.6}
                strokeDasharray="0.1 4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                opacity={c.dim ? 0.4 : 0.85}
              />
            ))}
          </svg>
        )}

        {/* locked upcoming nodes */}
        {Array.from({ length: LOCKED_AHEAD }).map((_, r) => {
          const right = xOfRow(r) > 50;
          const isNext = r === LOCKED_AHEAD - 1; // closest to the action
          const accent = isNext ? T.gold : T.muted;
          return (
            <div
              key={'lock-' + r}
              style={{
                position: 'absolute',
                left: xOfRow(r) + '%',
                top: yOfRow(r),
                width: 54,
                height: 54,
                transform: 'translate(-50%,-50%)',
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  border: '3px dashed ' + (isNext ? T.gold : T.line),
                  background: T.bg0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isNext ? 0.95 : 0.55,
                  boxShadow: isNext ? `0 0 10px ${T.gold}` : 'none',
                }}
              >
                <MonoIcon name="lock" size={20} color={accent} />
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  [right ? 'right' : 'left']: '100%',
                  [right ? 'marginRight' : 'marginLeft']: 12,
                  width: 122,
                  textAlign: right ? 'right' : 'left',
                  opacity: isNext ? 1 : 0.7,
                }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 7, color: accent }}>
                  {isNext ? '▲ UP NEXT' : 'LOCKED'}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: T.muted, marginTop: 4 }}>
                  {isNext ? "who's hungry?" : '???'}
                </div>
              </div>
            </div>
          );
        })}

        {/* claimed kebab nodes */}
        {feed.map((f, i) => {
          const r = rowOfFeed(i);
          const right = xOfRow(r) > 50;
          const head = i === 0;
          const num = N - i;
          const c = pColor(f.player);
          return (
            <div
              key={f.id || i}
              onClick={() => onSelect && onSelect(f)}
              style={{
                position: 'absolute',
                left: xOfRow(r) + '%',
                top: yOfRow(r),
                width: 54,
                height: 54,
                transform: 'translate(-50%,-50%)',
                cursor: onSelect ? 'pointer' : 'default',
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  border: '3px solid ' + (head ? T.gold : c),
                  background: T.surf,
                  position: 'relative',
                  boxShadow: head ? `0 0 0 3px ${T.bg0}, 0 0 14px ${T.gold}` : `0 4px 0 ${T.bg0}`,
                  animation: head ? 'bob 1.5s ease-in-out infinite' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <KebabSprite scale={2.7} theme={T} />
                <div
                  style={{
                    position: 'absolute',
                    top: -8,
                    [right ? 'left' : 'right']: -8,
                    background: T.bg0,
                    border: '2px solid ' + (head ? T.gold : c),
                    fontFamily: 'var(--font-display)',
                    fontSize: 7,
                    color: head ? T.gold : c,
                    padding: '3px 4px',
                  }}
                >
                  #{num}
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  [right ? 'right' : 'left']: '100%',
                  [right ? 'marginRight' : 'marginLeft']: 12,
                  width: 122,
                  textAlign: right ? 'right' : 'left',
                }}
              >
                {head && (
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 7, color: T.gold, marginBottom: 4 }}>
                    ★ LATEST
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    justifyContent: right ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Avatar n={f.avatar} size={16} theme={T} borderColor={c} style={{ order: right ? 2 : 0 }} />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: T.text }}>{f.player}</span>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: T.muted,
                    marginTop: 4,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {f.city}{f.cc ? ' · ' + f.cc : ''}
                </div>
                <div style={{ display: 'flex', justifyContent: right ? 'flex-end' : 'flex-start', marginTop: 5 }}>
                  <PixelStars value={f.rating} size={9} color={T.gold} dim={T.surf2} />
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: T.muted, marginTop: 4, opacity: 0.8 }}>
                  {f.when}
                </div>
              </div>
            </div>
          );
        })}

        {/* tail = trip start */}
        {N > 0 && (
          <div
            style={{
              position: 'absolute',
              left: xOfRow(rowOfFeed(N - 1)) + '%',
              top: yOfRow(rowOfFeed(N - 1)) + 64,
              transform: 'translateX(-50%)',
              textAlign: 'center',
              width: 140,
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: T.green }}>▶ TRIP START</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: T.muted, marginTop: 5 }}>
              {feed[feed.length - 1]?.city || 'Berlin'}, day one
            </div>
          </div>
        )}

        {N === 0 && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: yOfRow(LOCKED_AHEAD) + 4,
              transform: 'translateX(-50%)',
              textAlign: 'center',
              width: 240,
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: T.muted }}>
              CHAIN NOT STARTED
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: T.muted, marginTop: 10, lineHeight: 1.4 }}>
              Tap EAT KEBAB on HQ to claim the first link.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
