import React, { useEffect, useState } from 'react';
import { KebabSprite } from '../lib/sprites.jsx';
import { titleShadow } from '../lib/theme.js';

export function BootScreen({ theme, onStart }) {
  const T = theme;
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const i = setInterval(() => setBlink(b => !b), 520);
    return () => clearInterval(i);
  }, []);

  return (
    <div
      onClick={onStart}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 200,
        cursor: 'pointer',
        background: `radial-gradient(120% 90% at 50% 12%, ${T.surf} 0%, ${T.bg0} 70%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 58,
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {/* starfield blocks */}
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: ((i * 53) % 100) + '%',
            top: ((i * 37) % 100) + '%',
            width: 3,
            height: 3,
            background: T.muted,
            opacity: 0.4,
            animation: `twinkle ${1.5 + (i % 4) * 0.4}s steps(2) infinite ${i * 0.1}s`,
          }}
        />
      ))}

      <div style={{ animation: 'bob 1.6s ease-in-out infinite' }}>
        <KebabSprite scale={9} theme={T} />
      </div>

      <div style={{ marginTop: 34, lineHeight: 1.5 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            color: T.gold,
            textShadow: titleShadow(T, 3),
            letterSpacing: 1,
          }}
        >
          KEBAB
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            color: T.text,
            textShadow: titleShadow(T, 3),
            marginTop: 8,
          }}
        >
          QUEST
        </div>
      </div>

      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 18,
          color: T.muted,
          marginTop: 22,
          letterSpacing: 1,
        }}
      >
        ONE POD · MANY KEBABS
      </div>

      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 12,
          color: T.green,
          marginTop: 54,
          opacity: blink ? 1 : 0,
          letterSpacing: 1,
        }}
      >
        ▶ PRESS START
      </div>

      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          color: T.muted,
          position: 'absolute',
          bottom: 36,
          letterSpacing: 1,
          opacity: 0.7,
        }}
      >
        © 1989 KEBAB CORP
      </div>
    </div>
  );
}
