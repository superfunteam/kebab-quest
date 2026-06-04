import React, { useEffect, useMemo, useState } from 'react';
import { MonoIcon, Avatar, AVATAR_COUNT } from '../lib/sprites.jsx';
import { sfx } from '../lib/sound.js';

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
export function Onboarding({ theme, crew, claims, playerName, playerAvatar, onClaim, onDone }) {
  const T = theme;
  const claimMap = claims || {};
  const [name, setName] = useState(playerName || '');
  const [avatar, setAvatar] = useState(playerAvatar || 1);
  const [step, setStep] = useState(playerName ? 'how' : 'id');

  // Shuffled once per visit to the onboarding screen.
  const [roster] = useState(() => shuffle((crew && crew.length ? crew : []).map(c => c.name)));

  // Avatars already spoken for by OTHER players are off-limits — kept exclusive
  // across the whole pod. Your own currently-selected name never blocks itself.
  const takenByOthers = useMemo(() => {
    const s = new Set();
    for (const k in claimMap) {
      const c = claimMap[k];
      if (c && c.avatar != null && c.name !== name) s.add(c.avatar);
    }
    return s;
  }, [claimMap, name]);
  const available = useMemo(() => {
    const a = [];
    for (let i = 1; i <= AVATAR_COUNT; i++) if (!takenByOthers.has(i)) a.push(i);
    return a;
  }, [takenByOthers]);

  // If the face you're on gets claimed by someone else (live sync), hop to a free one.
  useEffect(() => {
    if (available.length && !available.includes(avatar)) setAvatar(available[0]);
  }, [available, avatar]);

  const next = () => {
    if (!name) return;
    sfx.pop();
    onClaim(name, avatar);
    setStep('how');
  };

  const pickName = (nm) => {
    sfx.blip();
    setName(nm);
    // Re-claiming a name on a new device? Snap back to that player's own face.
    const claimed = claimMap[nm];
    if (claimed && claimed.avatar != null) setAvatar(claimed.avatar);
  };

  // Avatar select: step left/right or randomize — but only across FREE faces.
  const stepAvatar = (delta) => {
    if (!available.length) return;
    sfx.blip();
    const i = available.indexOf(avatar);
    const base = i === -1 ? 0 : i;
    setAvatar(available[(base + delta + available.length) % available.length]);
  };
  const randomAvatar = () => {
    if (!available.length) return;
    sfx.shuffle();
    let n = avatar;
    for (let i = 0; i < 8 && n === avatar; i++) n = available[Math.floor(Math.random() * available.length)];
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
    { icon: 'coin',  title: 'TAP TO EAT',     body: 'Smash the kebab button every time you eat one — +1 to the POD SCORE, instantly. With a friend? Tag whose kebab it was.' },
    { icon: 'flame', title: 'KEEP YOUR STREAK', body: 'Eat at least one a day to grow your streak. Miss a day and it resets — or use a freebie to save it.' },
    { icon: 'crown', title: 'BEAT THE POD',    body: 'Climb the leaderboard. One pod, many kebabs — the last day is the final boss.' },
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
              const claimed = !!claimMap[nm];
              const isMine = claimed && claimMap[nm].name === playerName;
              // Claimed names are dimmed + struck through with a check — but still
              // tappable, so someone on a new phone can re-claim their own spot.
              const dim = claimed && !on;
              return (
                <button
                  key={nm}
                  onClick={() => pickName(nm)}
                  title={claimed ? (isMine ? 'This is you' : 'Already claimed — tap if this is you on a new device') : undefined}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    border: '2px solid ' + (on ? T.gold : claimed ? T.green : T.line),
                    background: on ? T.gold : T.surf,
                    color: on ? T.bg0 : dim ? T.muted : T.text,
                    fontFamily: 'var(--font-body)',
                    fontSize: 15,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    padding: '10px 4px',
                    cursor: 'pointer',
                    boxShadow: on ? 'none' : `0 3px 0 ${T.bg0}`,
                    opacity: dim ? 0.55 : 1,
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textDecoration: dim ? 'line-through' : 'none',
                    }}
                  >
                    {nm}
                  </span>
                  {claimed && (
                    <MonoIcon name="check" size={10} color={on ? T.bg0 : T.green} />
                  )}
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
                #{avatar} · {available.length} FREE
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
          onClick={() => { sfx.pop(); setStep('id'); }}
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
          onClick={() => { sfx.success(); onDone(); }}
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
