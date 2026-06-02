import React, { useEffect, useState } from 'react';
import { KebabSprite, MonoIcon } from '../lib/sprites.jsx';
import { sfx } from '../lib/sound.js';

// Shown the FIRST time a player taps EAT KEBAB. They must tick the checkbox to
// confirm they actually ate one — guards against accidental logs. Once confirmed
// the flag persists (kq:eatConfirmed) and this never appears again.
export function ConfirmEatModal({ open, theme, onConfirm, onCancel }) {
  const T = theme;
  const [checked, setChecked] = useState(false);

  useEffect(() => { if (open) setChecked(false); }, [open]);
  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 220,
        background: 'rgba(0,0,0,0.74)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        animation: 'fadeIn .15s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 360,
          background: T.bg1,
          border: '3px solid ' + T.gold,
          boxShadow: `0 6px 0 ${T.bg0}`,
          padding: '20px 18px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ animation: 'bob 1.6s ease-in-out infinite' }}>
            <KebabSprite scale={3} theme={T} />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: T.gold, textShadow: `2px 2px 0 ${T.bg0}` }}>
            HOLD UP!
          </div>
        </div>

        <div style={{ fontFamily: 'var(--font-body)', fontSize: 17, color: T.text, lineHeight: 1.4, marginBottom: 18 }}>
          Smashing this logs a <b style={{ color: T.gold }}>REAL kebab</b> to the pod score. Only do it if
          you've <b style={{ color: T.gold }}>actually eaten one</b> — no accidental taps.
        </div>

        <label
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            cursor: 'pointer',
            marginBottom: 18,
            background: T.surf,
            border: '2px solid ' + (checked ? T.green : T.line),
            padding: '12px 13px',
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              flexShrink: 0,
              background: checked ? T.green : T.bg0,
              border: '2px solid ' + (checked ? T.green : T.muted),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {checked && <MonoIcon name="check" size={15} color={T.bg0} />}
          </div>
          <input
            type="checkbox"
            checked={checked}
            onChange={e => { sfx.blip(); setChecked(e.target.checked); }}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: T.text, lineHeight: 1.3 }}>
            Yeah — I actually ate a kebab.
          </span>
        </label>

        <button
          onClick={() => checked && onConfirm()}
          disabled={!checked}
          style={{
            width: '100%',
            border: 'none',
            background: checked ? T.green : T.line,
            color: T.bg0,
            padding: '15px',
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            cursor: checked ? 'pointer' : 'default',
            boxShadow: `0 5px 0 ${T.bg0}`,
            opacity: checked ? 1 : 0.6,
          }}
        >
          LET'S EAT 🥙
        </button>
        <button
          onClick={() => { sfx.pop(); onCancel(); }}
          style={{
            width: '100%',
            border: 'none',
            background: 'none',
            color: T.muted,
            padding: '13px',
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          NOT YET
        </button>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: T.muted, textAlign: 'center', opacity: 0.8 }}>
          You'll only see this the first time.
        </div>
      </div>
    </div>
  );
}
