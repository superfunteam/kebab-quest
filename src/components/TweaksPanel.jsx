import React from 'react';
import { MonoIcon, Avatar } from '../lib/sprites.jsx';
import { PALETTES, colorOf } from '../lib/theme.js';

export function TweaksPanel({
  theme, settings, setTweak,
  playerName, playerAvatar, onClaimIdentity,
  isAdmin,
  crew, onCrewChange,
  online, syncing, pendingCount, lastSyncTs, syncError, onSync,
  onShowBoot, onShowOnboard, onReset,
  onClose,
}) {
  const T = theme;
  const COLORS = ['gold', 'red', 'blue', 'green', 'accent', 'muted'];

  const updateMember = (i, patch) => {
    onCrewChange(crew.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  };
  const addMember = () => {
    const name = ('PLAYER' + (crew.length + 1)).slice(0, 12);
    onCrewChange([...crew, { name, kebabs: 0, streak: 0, color: COLORS[crew.length % COLORS.length], avatar: (crew.length % 48) + 1 }]);
  };
  const removeMember = (i) => {
    if (crew[i].you) return;
    onCrewChange(crew.filter((_, idx) => idx !== i));
  };

  const section = (label) => (
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: T.gold, letterSpacing: 1, margin: '18px 0 10px' }}>
      ▶ {label}
    </div>
  );

  const row = (label, control) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px dashed ' + T.line }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: T.muted, flex: 1 }}>{label}</div>
      <div>{control}</div>
    </div>
  );

  const input = {
    background: T.bg0,
    border: '2px solid ' + T.line,
    color: T.text,
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    padding: '6px 8px',
    outline: 'none',
    minWidth: 0,
    boxSizing: 'border-box',
  };

  const lastSyncLabel = lastSyncTs
    ? new Date(lastSyncTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'never';

  return (
    <div
      style={{ position: 'absolute', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(420px, 100%)',
          height: '100%',
          background: T.bg1,
          borderLeft: '3px solid ' + T.gold,
          overflowY: 'auto',
          padding: 'calc(20px + var(--safe-top)) 20px calc(20px + var(--safe-bottom))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: T.text, textShadow: `2px 2px 0 ${T.bg0}` }}>
            TWEAKS
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, fontFamily: 'var(--font-display)', fontSize: 12, cursor: 'pointer' }}>
            ✕
          </button>
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: T.muted, letterSpacing: 1 }}>
          QUEST · SETUP · OPTIONS
        </div>

        {/* ── Everyone ───────────────────────────── */}
        {section('YOU')}
        {row(
          'Playing as',
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar n={playerAvatar} size={26} theme={T} borderColor={T.gold} />
            <select value={playerName} onChange={e => onClaimIdentity(e.target.value)} style={{ ...input, width: 120 }}>
              {!playerName && <option value="">— pick —</option>}
              {crew.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: T.muted, marginTop: 8, lineHeight: 1.4 }}>
          No password — this device just remembers who you are. Everyone's auto-synced to the same pod.
        </div>

        {section('LOOK')}
        {row(
          'Palette',
          <select value={settings.palette} onChange={e => setTweak('palette', e.target.value)} style={{ ...input, paddingRight: 22 }}>
            {Object.keys(PALETTES).map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        )}
        {row('Scanlines', <Toggle theme={T} value={settings.scanlines} onChange={v => setTweak('scanlines', v)} />)}
        {row('CRT vignette', <Toggle theme={T} value={settings.crt} onChange={v => setTweak('crt', v)} />)}

        {section('VOICE')}
        {row(
          'Tone',
          <div style={{ display: 'flex', gap: 6 }}>
            {['hype', 'dry'].map(t => (
              <button
                key={t}
                onClick={() => setTweak('tone', t)}
                style={{
                  border: '2px solid ' + (settings.tone === t ? T.gold : T.line),
                  background: settings.tone === t ? T.gold : 'transparent',
                  color: settings.tone === t ? T.bg0 : T.muted,
                  padding: '6px 10px',
                  fontFamily: 'var(--font-display)',
                  fontSize: 8,
                  cursor: 'pointer',
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {section('GAME')}
        <Button theme={T} onClick={onShowBoot} label="Show title screen" />
        <Button theme={T} onClick={onShowOnboard} label="How to play" />

        {/* ── Clark only ─────────────────────────── */}
        {isAdmin && (
          <>
            <div style={{ margin: '26px 0 4px', padding: '10px 12px', background: T.surf, border: '2px solid ' + T.gold, display: 'flex', alignItems: 'center', gap: 9 }}>
              <MonoIcon name="gear" size={12} color={T.gold} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: T.gold, letterSpacing: 1 }}>CLARK ZONE</span>
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: T.muted, margin: '7px 0 2px', lineHeight: 1.4 }}>
              Admin tools — only you see these.
            </div>

            {section('SYNC')}
            {row(
              'Status',
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: !online ? T.red : syncing ? T.gold : T.green }}>
                {!online ? 'OFFLINE' : syncing ? 'SYNCING' : pendingCount > 0 ? `${pendingCount} QUEUED` : 'SYNCED'}
              </span>
            )}
            {row('Last sync', <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: T.muted }}>{lastSyncLabel}</span>)}
            {syncError && row('Last error', <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: T.red }}>{syncError}</span>)}
            <button
              onClick={onSync}
              style={{ width: '100%', border: 'none', background: T.green, color: T.bg0, padding: '12px', fontFamily: 'var(--font-display)', fontSize: 10, cursor: 'pointer', boxShadow: `0 4px 0 ${T.bg0}`, marginTop: 12 }}
            >
              ⟳ SYNC NOW
            </button>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: T.muted, marginTop: 10, lineHeight: 1.4 }}>
              The whole pod shares one trip — every player's kebabs sync here automatically, no codes.
            </div>

            {section('POD ROSTER')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {crew.map((m, i) => (
                <div key={m.name + i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: T.surf, border: '2px solid ' + T.line }}>
                  <Avatar n={m.avatar} size={28} theme={T} borderColor={colorOf(T, m.color)} />
                  <input style={{ ...input, flex: 1, minWidth: 50 }} value={m.name} maxLength={12} onChange={e => updateMember(i, { name: e.target.value.toUpperCase() })} />
                  <select value={m.color} onChange={e => updateMember(i, { color: e.target.value })} style={{ ...input, width: 80 }}>
                    {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button
                    onClick={() => removeMember(i)}
                    disabled={m.you}
                    style={{ background: 'none', border: 'none', color: m.you ? T.muted : T.red, cursor: m.you ? 'default' : 'pointer', fontFamily: 'var(--font-display)', fontSize: 11, opacity: m.you ? 0.4 : 1 }}
                    title={m.you ? "Can't remove yourself" : 'Remove'}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={addMember}
                style={{ border: '2px dashed ' + T.line, background: 'transparent', color: T.muted, fontFamily: 'var(--font-display)', fontSize: 9, padding: 10, cursor: 'pointer', letterSpacing: 1 }}
              >
                + ADD PLAYER
              </button>
            </div>

            <div style={{ marginTop: 18 }}>
              <Button theme={T} onClick={onReset} label="Reset all kebabs (whole pod)" danger />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Toggle({ theme, value, onChange }) {
  const T = theme;
  return (
    <button
      onClick={() => onChange(!value)}
      style={{ width: 50, height: 24, background: value ? T.green : T.bg0, border: '2px solid ' + (value ? T.green : T.line), position: 'relative', cursor: 'pointer', padding: 0 }}
    >
      <div style={{ position: 'absolute', top: 2, left: value ? 26 : 2, width: 16, height: 16, background: value ? T.bg0 : T.muted, transition: 'left .12s steps(3)' }} />
    </button>
  );
}

function Button({ theme, onClick, label, danger }) {
  const T = theme;
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        border: '2px solid ' + (danger ? T.red : T.line),
        background: T.surf,
        color: danger ? T.red : T.text,
        padding: '10px 12px',
        fontFamily: 'var(--font-body)',
        fontSize: 15,
        cursor: 'pointer',
        textAlign: 'left',
        marginTop: 8,
        boxShadow: `0 3px 0 ${T.bg0}`,
      }}
    >
      {label}
    </button>
  );
}
