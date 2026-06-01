import React, { useState } from 'react';
import { MonoIcon, Avatar } from '../lib/sprites.jsx';
import { colorOf } from '../lib/theme.js';
import { Panel } from '../components/Panel.jsx';

export function HQScreen({ theme, voice, crew, groupScore, todayCount, you, currentCity, currentCC, onTap, justScored }) {
  const T = theme;
  const V = voice;
  const top3 = [...crew].sort((a, b) => b.kebabs - a.kebabs).slice(0, 3);
  const [press, setPress] = useState(false);

  return (
    <div style={{ padding: '6px 16px 0', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* HUD strip */}
      <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: T.red, letterSpacing: 1 }}>
            1UP · {V.scoreLabel}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
            <MonoIcon name="coin" size={26} color={T.gold} />
            <div
              key={groupScore}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 34,
                color: T.gold,
                letterSpacing: 1,
                textShadow: `2px 2px 0 ${T.bg0}`,
                animation: justScored ? 'scorePop .4s steps(3)' : 'none',
              }}
            >
              {String(groupScore).padStart(3, '0')}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: T.muted, letterSpacing: 1 }}>TODAY</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: T.green, marginTop: 7 }}>+{todayCount}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, justifyContent: 'flex-end' }}>
            <MonoIcon name="pin" size={11} color={T.red} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: T.muted, whiteSpace: 'nowrap' }}>
              {currentCity}{currentCC ? ' · ' + currentCC : ''}
            </span>
          </div>
        </div>
      </div>

      {/* YOUR panel */}
      <Panel theme={T} accent={T.red} style={{ padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar n={you?.avatar} size={44} theme={T} borderColor={T.red} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {you?.name || 'YOU'}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: T.muted, marginTop: 3 }}>
              {you?.kebabs || 0} kebabs eaten
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 12, borderLeft: '2px solid ' + T.line }}>
            <MonoIcon name="flame" size={22} color={T.gold} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: T.gold, lineHeight: 1 }}>
                {you?.streak || 0}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 6, color: T.muted, marginTop: 3 }}>
                {V.streakLabel}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* THE BUTTON */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          position: 'relative',
        }}
      >
        <button
          onPointerDown={() => setPress(true)}
          onPointerUp={() => setPress(false)}
          onPointerLeave={() => setPress(false)}
          onPointerCancel={() => setPress(false)}
          onClick={onTap}
          style={{
            position: 'relative',
            width: 196,
            height: 196,
            border: '4px solid ' + T.bg0,
            background: `repeating-linear-gradient(135deg, ${T.surf2}, ${T.surf2} 10px, ${T.surf} 10px, ${T.surf} 20px)`,
            cursor: 'pointer',
            padding: 0,
            outline: '4px solid ' + T.gold,
            outlineOffset: -10,
            boxShadow: press ? `0 0 0 ${T.bg0}` : `0 10px 0 ${T.bg0}, 0 10px 0 4px ${T.line}`,
            transform: press ? 'translateY(10px)' : 'translateY(0)',
            transition: 'all .07s steps(2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <div style={{ animation: 'bob 1.7s ease-in-out infinite' }}>
            <img
              src="/kebab.png"
              alt="Kebab"
              draggable={false}
              style={{ display: 'block', height: 116, width: 'auto', imageRendering: 'auto' }}
            />
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              color: T.gold,
              textShadow: `2px 2px 0 ${T.bg0}`,
            }}
          >
            {V.cta}
          </div>
        </button>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            color: T.muted,
            letterSpacing: 1,
            textAlign: 'center',
            minHeight: 22,
            animation: 'blinkSlow 1.4s steps(2) infinite',
          }}
        >
          {V.todayPrompt}
        </div>
      </div>

      {/* Crew leaderboard ticker */}
      <Panel theme={T} style={{ padding: '10px 12px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: T.muted }}>POD LEADERS</div>
          <MonoIcon name="crown" size={14} color={T.gold} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {top3.map((p, i) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: i === 0 ? T.gold : T.muted, width: 16 }}>
                {i + 1}
              </span>
              <Avatar n={p.avatar} size={18} theme={T} borderColor={colorOf(T, p.color)} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: T.text, flex: 1, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, overflow: 'hidden' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                {p.king && <MonoIcon name="crown" size={11} color={T.gold} />}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: colorOf(T, p.color) }}>
                {p.kebabs}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
