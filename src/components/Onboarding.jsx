import React, { useState } from 'react';
import { MonoIcon, Avatar, AVATAR_COUNT } from '../lib/sprites.jsx';

// Fisher-Yates — so the name list looks random, not a fixed roster order.
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Two-step onboarding:
//  1) WHO ARE YOU? — claim a roster name + pick a pixel avatar (no password).
//  2) HOW TO PLAY  — the quick rules, then START QUEST.
export function Onboarding({ theme, crew, playerName, playerAvatar, onClaim, onDone }) {
  const T = theme;
  const [name, setName] = useState(playerName || '');
  const [avatar, setAvatar] = useState(playerAvatar || 1);
  const [step, setStep] = useState(playerName ? 'how' : 'id');

  // Shuffled once per visit to the onboarding screen.
  const [roster] = useState(() => shuffle((crew && crew.length ? crew : []).map(c => c.name)));

  const next = () => {
    if (!name) return;
    onClaim(name, avatar);
    setStep('how');
  };

  // Avatar select: step left/right (wraps) or randomize from the folder.
  const stepAvatar = (delta) => setAvatar(a => ((a - 1 + delta + AVATAR_COUNT) % AVATAR_COUNT) + 1);
  const randomAvatar = () => {
    let n = avatar;
    for (let i = 0; i < 8 && n === avatar; i++) n = Math.floor(Math.random() * AVATAR_COUNT) + 1;
    setAvatar(n);
  };
  const arrowStyle = {
    border: '2px solid ' + T.line,
    background: T.surf,
    color: T.gold,
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    lineHeight: 1,
    width: 46,
    height: 46,
    cursor: 'pointer',
    boxShadow: `0 4px 0 ${T.bg0}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const steps = [
    { icon: 'coin',  title: 'TAP TO EAT',       body: 'Smash the kebab button every time you eat one. +1 to the POD SCORE — instantly.' },
    { icon: 'flame', title: 'KEEP IT LIT',      body: 'Eat at least one a day to grow your personal streak. Miss a day and it resets.' },
    { icon: 'snow',  title: 'BANK A CHEAT DAY', body: 'Out of luck? Burn a streak freeze to save a missed day and keep the chain alive.' },
    { icon: 'crew',  title: 'LOG FOR ANYONE',   body: "Eating with friends who aren't on their phone? When you log, just tag whose kebab it was." },
    { icon: 'crown', title: 'BEAT THE POD',     body: 'Climb the leaderboard. One pod, many kebabs — the last day is the final boss.' },
  ];

  const wrap = {
    position: 'absolute',
    inset: 0,
    zIndex: 190,
    paddingTop: 'calc(40px + var(--safe-top))',
    background: `linear-gradient(${T.bg1}, ${T.bg0})`,
    display: 'flex',
    flexDirection: 'column',
  };

  if (step === 'id') {
    return (
      <div style={wrap}>
        <div style={{ padding: '14px 20px 8px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: T.gold, textShadow: `2px 2px 0 ${T.bg0}` }}>
            WHO ARE YOU?
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: T.muted, marginTop: 8, letterSpacing: 1 }}>
            CLAIM YOUR SPOT · NO PASSWORD
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 8px' }}>
          {/* name chips */}
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: T.gold, margin: '6px 0 10px' }}>▶ YOUR NAME</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {roster.map(nm => {
              const on = nm === name;
              return (
                <button
                  key={nm}
                  onClick={() => setName(nm)}
                  style={{
                    border: '2px solid ' + (on ? T.gold : T.line),
                    background: on ? T.gold : T.surf,
                    color: on ? T.bg0 : T.text,
                    fontFamily: 'var(--font-body)',
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    padding: '10px 4px',
                    cursor: 'pointer',
                    boxShadow: on ? 'none' : `0 3px 0 ${T.bg0}`,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {nm}
                </button>
              );
            })}
          </div>

          {/* avatar picker — character select: step ‹ › or randomize */}
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: T.gold, margin: '22px 0 14px' }}>
            ▶ PICK YOUR FIGHTER
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
            <button onClick={() => stepAvatar(-1)} aria-label="Previous avatar" style={arrowStyle}>‹</button>
            <div style={{ textAlign: 'center' }}>
              <Avatar n={avatar} size={108} theme={T} borderColor={T.gold} style={{ boxShadow: `0 0 14px ${T.gold}` }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: T.muted, marginTop: 9 }}>
                #{avatar} / {AVATAR_COUNT}
              </div>
            </div>
            <button onClick={() => stepAvatar(1)} aria-label="Next avatar" style={arrowStyle}>›</button>
          </div>
          <button
            onClick={randomAvatar}
            style={{
              display: 'block',
              margin: '16px auto 0',
              border: '2px solid ' + T.line,
              background: T.surf,
              color: T.text,
              fontFamily: 'var(--font-display)',
              fontSize: 9,
              letterSpacing: 1,
              padding: '11px 18px',
              cursor: 'pointer',
              boxShadow: `0 4px 0 ${T.bg0}`,
            }}
          >
            🎲 RANDOM
          </button>
        </div>

        <div style={{ padding: '12px 20px calc(22px + var(--safe-bottom))' }}>
          <button
            onClick={next}
            disabled={!name}
            style={{
              width: '100%',
              border: 'none',
              background: name ? T.green : T.line,
              color: T.bg0,
              padding: '15px',
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              cursor: name ? 'pointer' : 'default',
              boxShadow: `0 5px 0 ${T.bg0}`,
              opacity: name ? 1 : 0.6,
            }}
          >
            {name ? `I'M ${name} ▶` : 'PICK A NAME'}
          </button>
        </div>
      </div>
    );
  }

  // step === 'how'
  return (
    <div style={wrap}>
      <div style={{ padding: '14px 20px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar n={avatar} size={32} theme={T} borderColor={T.gold} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: T.gold, textShadow: `2px 2px 0 ${T.bg0}` }}>
              HOW TO PLAY
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: T.muted, marginTop: 6, letterSpacing: 1 }}>
              READY, {name || 'PLAYER'}?
            </div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 8px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {steps.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 13,
              alignItems: 'flex-start',
              background: T.surf,
              border: '2px solid ' + T.line,
              boxShadow: `0 4px 0 ${T.bg0}`,
              padding: 13,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                flexShrink: 0,
                background: T.bg0,
                border: '2px solid ' + T.gold,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MonoIcon name={s.icon} size={22} color={T.gold} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: T.green }}>{i + 1}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: T.text }}>{s.title}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: T.muted, marginTop: 6, lineHeight: 1.35 }}>
                {s.body}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 20px calc(22px + var(--safe-bottom))', display: 'flex', gap: 10 }}>
        <button
          onClick={() => setStep('id')}
          style={{
            border: '2px solid ' + T.line,
            background: T.surf,
            color: T.muted,
            padding: '15px 16px',
            fontFamily: 'var(--font-display)',
            fontSize: 10,
            cursor: 'pointer',
            boxShadow: `0 5px 0 ${T.bg0}`,
            flexShrink: 0,
          }}
        >
          ‹
        </button>
        <button
          onClick={onDone}
          style={{
            flex: 1,
            border: 'none',
            background: T.green,
            color: T.bg0,
            padding: '15px',
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            cursor: 'pointer',
            boxShadow: `0 5px 0 ${T.bg0}`,
          }}
        >
          ▶ START QUEST
        </button>
      </div>
    </div>
  );
}
