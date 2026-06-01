import React, { useEffect, useState } from 'react';
import { MonoIcon } from '../lib/sprites.jsx';

// Tiny indicator pinned to the top-right. Shows offline / syncing / synced state.
// Designed to be unobtrusive when everything's fine and only loud when offline.
export function SyncBadge({ theme, online, syncing, pendingCount, onClick }) {
  const T = theme;
  const [showSynced, setShowSynced] = useState(false);

  useEffect(() => {
    if (!syncing && online && pendingCount === 0) {
      setShowSynced(true);
      const t = setTimeout(() => setShowSynced(false), 1500);
      return () => clearTimeout(t);
    }
  }, [syncing, online, pendingCount]);

  let label = 'ONLINE';
  let color = T.green;
  let icon = 'cloud';

  if (!online) {
    label = 'OFFLINE';
    color = T.red;
    icon = 'bolt';
  } else if (syncing) {
    label = 'SYNC…';
    color = T.gold;
    icon = 'cloud';
  } else if (pendingCount > 0) {
    label = `+${pendingCount} Q`;
    color = T.gold;
    icon = 'cloud';
  } else if (!showSynced) {
    // Once we've shown the green tick briefly, fade to a quiet dot to stay out of the way.
    label = '';
    color = T.muted;
    icon = 'cloud';
  }

  return (
    <button
      onClick={onClick}
      title="Sync status"
      style={{
        position: 'absolute',
        top: 'calc(8px + var(--safe-top))',
        right: 12,
        zIndex: 130,
        background: 'rgba(0,0,0,0.5)',
        border: '2px solid ' + color,
        padding: '4px 7px',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        cursor: 'pointer',
        boxShadow: `0 3px 0 ${T.bg0}`,
        opacity: !online || syncing || pendingCount > 0 || showSynced ? 1 : 0.55,
        transition: 'opacity 0.3s',
      }}
    >
      <MonoIcon name={icon} size={11} color={color} />
      {label && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 6,
            color,
            letterSpacing: 0.5,
          }}
        >
          {label}
        </span>
      )}
    </button>
  );
}
