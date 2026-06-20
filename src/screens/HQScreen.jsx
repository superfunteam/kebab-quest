import React, { useState } from 'react';
import { MonoIcon, Avatar } from '../lib/sprites.jsx';
import { colorOf } from '../lib/theme.js';
import { Panel } from '../components/Panel.jsx';
import { rankCrew, placeOf } from '../lib/ranking.js';

export function HQScreen({ theme, voice, crew, groupScore, todayCount, you, currentCity, currentCC, onTap, justScored, gameOver, onShowWinner }) {
  const T = theme;
  const V = voice;
  // Same tie rules as the POD screen: co-first on kebab count, current player on
  // top of their tie group. Rank off the full pod, then take the top 3 to show.
  const ranked = rankCrew(crew);
  const top3 = ranked.slice(0, 3);
  const [press, setPress] = useState(false);

  // Once the trip's over the EAT button is gone — swap in the champion(s).
  const maxK = Math.max(0, ...crew.map(c => c.kebabs || 0));
  const champions = maxK > 0 ? crew.filter(c => (c.kebabs || 0) === maxK) : [];

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
          {currentCity && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, justifyContent: 'flex-end' }}>
              <MonoIcon name="pin" size={11} color={T.red} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: T.muted, whiteSpace: 'nowrap' }}>
                {currentCity}{currentCC ? ' · ' + currentCC : ''}
              </span>
            </div>
          )}
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

      {/* THE BUTTON — swapped for the winner card once the trip is over */}
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
        {gameOver ? (
          <button
            onClick={onShowWinner}
            style={{
              width: '100%',
              maxWidth: 300,
              border: '3px solid ' + T.gold,
              background: `repeating-linear-gradient(135deg, ${T.surf}, ${T.surf} 10px, ${T.surf2} 10px, ${T.surf2} 20px)`,
              boxShadow: `0 6px 0 ${T.bg0}`,
              cursor: 'pointer',
              padding: '18px 16px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: T.red, letterSpacing: 2 }}>
              ★ TRIP COMPLETE ★
            </div>
            <div style={{ animation: 'bob 1.8s ease-in-out infinite' }}>
              <MonoIcon name="crown" size={40} color={T.gold} />
            </div>
            {champions.length > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {champions.map(c => (
                    <Avatar key={c.name} n={c.avatar} size={champions.length > 1 ? 44 : 56} theme={T} borderColor={T.gold} />
                  ))}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: T.text }}>
                  {champions.map(c => c.name).join(' & ')}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: T.gold }}>
                  CHAMPION{champions.length > 1 ? 'S' : ''} · {maxK} KEBABS
                </div>
              </>
            ) : (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: T.muted }}>
                The board stayed empty.
              </div>
            )}
            <div
              style={{
                marginTop: 4,
                fontFamily: 'var(--font-display)',
                fontSize: 9,
                color: T.green,
                border: '2px solid ' + T.green,
                padding: '8px 12px',
              }}
            >
              VIEW RESULTS →
            </div>
          </button>
        ) : (
        <>
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
        </>
        )}
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
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: placeOf(ranked, i) === 1 ? T.gold : T.muted, width: 16 }}>
                {placeOf(ranked, i)}
              </span>
              <Avatar n={p.avatar} size={18} theme={T} borderColor={colorOf(T, p.color)} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: T.text, flex: 1, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, overflow: 'hidden' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                {(placeOf(ranked, i) === 1 || p.king) && <MonoIcon name="crown" size={11} color={T.gold} />}
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
