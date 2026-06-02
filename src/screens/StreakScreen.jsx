import React from 'react';
import { MonoIcon } from '../lib/sprites.jsx';
import { titleShadow } from '../lib/theme.js';
import { computeStreak, TRIP_LABEL } from '../lib/data.js';

export function StreakScreen({ theme, voice, days, tripDays, freezes, onFreeze }) {
  const T = theme;
  const V = voice;
  const s = computeStreak(days);
  const todayIdx = days.length - 1;
  const todayEaten = days[todayIdx] && days[todayIdx].count > 0;

  const cell = (label, val, icon, col) => (
    <div
      style={{
        flex: 1,
        background: T.surf,
        border: '2px solid ' + T.line,
        boxShadow: `0 4px 0 ${T.bg0}`,
        padding: '12px 10px',
      }}
    >
      <MonoIcon name={icon} size={15} color={col} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: col, marginTop: 9 }}>{val}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 6, color: T.muted, marginTop: 6 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '8px 16px 0' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: T.text, textShadow: titleShadow(T) }}>
        {V.streakTitle}
      </div>

      {/* hero */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '18px 0 20px' }}>
        <div style={{ animation: 'bob 1.6s ease-in-out infinite' }}>
          <MonoIcon name="flame" size={64} color={T.gold} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 44, color: T.gold, textShadow: `3px 3px 0 ${T.bg0}` }}>
              {s.cur}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: T.muted, marginBottom: 6 }}>
              DAY{s.cur === 1 ? '' : 'S'}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: T.green, marginTop: 6, letterSpacing: 1 }}>
            {V.streakSub}
          </div>
        </div>
      </div>

      {/* day grid */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 11 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: T.gold }}>▶ TRIP CALENDAR</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: T.muted, letterSpacing: 1 }}>{TRIP_LABEL}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 7, marginBottom: 22 }}>
        {Array.from({ length: tripDays }).map((_, i) => {
          const real = i < days.length;
          const d = real ? days[i] : null;
          const today = i === todayIdx;
          const eaten = real && d.count > 0;
          const frozen = real && d.frozen;
          // Today isn't "missed" until the day is actually over — you can still eat.
          const missed = real && d.count === 0 && !d.frozen && !today;
          const bc = today ? T.gold : eaten ? T.green : frozen ? T.blue : missed ? T.red : T.line;
          return (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                border: '2px solid ' + bc,
                background: eaten ? T.surf2 : frozen ? T.surf : T.bg0,
                opacity: real ? 1 : 0.45,
                boxShadow: today ? `0 0 8px ${T.gold}` : 'none',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: 3,
                  fontFamily: 'var(--font-display)',
                  fontSize: 6,
                  color: T.muted,
                }}
              >
                {i + 1}
              </span>
              {eaten ? (
                <MonoIcon name={today ? 'flame' : 'check'} size={today ? 16 : 14} color={today ? T.gold : T.green} />
              ) : frozen ? (
                <MonoIcon name="snow" size={14} color={T.blue} />
              ) : today ? (
                <MonoIcon name="flame" size={15} color={T.muted} />
              ) : missed ? (
                <MonoIcon name="cross" size={12} color={T.red} />
              ) : (
                <span style={{ width: 4, height: 4, background: T.line }} />
              )}
              {eaten && d.count > 1 && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 1,
                    right: 3,
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: T.gold,
                  }}
                >
                  x{d.count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {cell('CURRENT', s.cur, 'flame', T.gold)}
        {cell('LONGEST', s.longest, 'crown', T.blue)}
        {cell('KEBABS', s.kebabs, 'coin', T.green)}
        {cell('FREEZES', freezes, 'snow', T.blue)}
      </div>

      {/* freeze mechanic */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '13px 14px 15px',
          marginBottom: 18,
          background: `repeating-linear-gradient(135deg, ${T.surf}, ${T.surf} 10px, ${T.surf2} 10px, ${T.surf2} 20px)`,
          border: '2px solid ' + T.blue,
          boxShadow: `0 4px 0 ${T.bg0}`,
        }}
      >
        <MonoIcon name="snow" size={24} color={T.blue} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: T.blue }}>
            STREAK FREEZE × {freezes}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: T.text, marginTop: 5, lineHeight: 1.3 }}>
            Burn one to save a missed day. Cheat days keep the chain alive.
          </div>
        </div>
        <button
          onClick={onFreeze}
          disabled={freezes < 1 || todayEaten}
          style={{
            border: 'none',
            background: (freezes < 1 || todayEaten) ? T.line : T.blue,
            flexShrink: 0,
            color: T.bg0,
            fontFamily: 'var(--font-display)',
            fontSize: 8,
            padding: '10px 11px',
            textAlign: 'center',
            whiteSpace: 'pre-line',
            lineHeight: 1.4,
            alignSelf: 'center',
            cursor: (freezes < 1 || todayEaten) ? 'default' : 'pointer',
            boxShadow: `0 4px 0 ${T.bg0}`,
            opacity: (freezes < 1 || todayEaten) ? 0.6 : 1,
          }}
        >
          {todayEaten ? 'SAFE' : 'FREEZE\nTODAY'}
        </button>
      </div>
    </div>
  );
}
