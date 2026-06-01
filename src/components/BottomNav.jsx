import React from 'react';
import { MonoIcon } from '../lib/sprites.jsx';

export function BottomNav({ tab, setTab, theme }) {
  const T = theme;
  const tabs = [
    { id: 'hq',     label: 'HQ',     icon: 'home' },
    { id: 'chain',  label: 'CHAIN',  icon: 'link' },
    { id: 'streak', label: 'STREAK', icon: 'flame' },
    { id: 'crew',   label: 'POD',    icon: 'crew' },
    { id: 'log',    label: 'LOG',    icon: 'scroll' },
  ];
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 70,
        paddingBottom: 'calc(14px + var(--safe-bottom))',
        paddingTop: 10,
        background: T.bg0,
        borderTop: '3px solid ' + T.line,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
      }}
    >
      {tabs.map(tb => {
        const active = tab === tb.id;
        return (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '4px 5px',
              minWidth: 50,
            }}
          >
            <MonoIcon name={tb.icon} size={19} color={active ? T.gold : T.muted} />
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 7,
                letterSpacing: 0.3,
                color: active ? T.gold : T.muted,
                animation: active ? 'tabBlink 1.1s steps(2) infinite' : 'none',
              }}
            >
              {tb.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
