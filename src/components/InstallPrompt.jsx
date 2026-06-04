import React from 'react';
import { KebabSprite } from '../lib/sprites.jsx';
import { sfx } from '../lib/sound.js';

// Nudges returning players to install the PWA to their home screen. On
// Android/Chrome we can fire the real install prompt (canInstall); on iOS
// Safari there's no programmatic prompt, so we show the manual Share → Add to
// Home Screen steps instead.
export function InstallPrompt({ open, theme, canInstall, isIOS, onInstall, onDismiss }) {
  const T = theme;
  if (!open) return null;

  const shareGlyph = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 16,
        height: 16,
        border: '1px solid ' + T.gold,
        color: T.gold,
        fontSize: 11,
        lineHeight: 1,
        verticalAlign: 'middle',
        margin: '0 2px',
      }}
    >
      ↑
    </span>
  );

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 240,
        background: 'rgba(0,0,0,0.78)',
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
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: T.gold, textShadow: `2px 2px 0 ${T.bg0}` }}>
            TAKE IT WITH YOU
          </div>
        </div>

        <div style={{ fontFamily: 'var(--font-body)', fontSize: 17, color: T.text, lineHeight: 1.4, marginBottom: 18 }}>
          Add <b style={{ color: T.gold }}>Kebab Quest</b> to your home screen — opens in one tap, full-screen, and works offline on dodgy wifi.
        </div>

        {canInstall ? (
          <button
            onClick={() => { sfx.success(); onInstall(); }}
            style={{
              width: '100%',
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
            ADD TO HOME SCREEN 🥙
          </button>
        ) : (
          <div style={{ border: '2px dashed ' + T.line, background: T.surf, padding: '12px 13px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: T.green, marginBottom: 8 }}>
              {isIOS ? '▶ ON IPHONE' : '▶ HOW TO INSTALL'}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: T.text, lineHeight: 1.5 }}>
              {isIOS ? (
                <>
                  Tap the <b style={{ color: T.gold }}>Share</b> button {shareGlyph} in the bar below, then{' '}
                  <b style={{ color: T.gold }}>Add to Home Screen</b>.
                </>
              ) : (
                <>
                  Open your browser menu <b style={{ color: T.gold }}>⋮</b> and choose{' '}
                  <b style={{ color: T.gold }}>Install app</b> / <b style={{ color: T.gold }}>Add to Home screen</b>.
                </>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => { sfx.pop(); onDismiss(); }}
          style={{
            width: '100%',
            border: 'none',
            background: 'none',
            color: T.muted,
            padding: '14px',
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          MAYBE LATER
        </button>
      </div>
    </div>
  );
}
