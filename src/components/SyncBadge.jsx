import React, { useEffect, useRef, useState } from 'react';
import { MonoIcon } from '../lib/sprites.jsx';

// Tiny indicator pinned to the top-right. Its only job is to flag the two things
// that actually matter on spotty overseas wifi: you're OFFLINE, or you have
// kebabs QUEUED that haven't reached the pod yet. Your taps are always saved
// locally first, so nothing is ever lost — this just shows whether the pod has
// caught up.
//
// Deliberately calm: the app does a silent background sync every 25s, and we do
// NOT flash the badge for those. We only surface "SYNC…" when a sync is
// genuinely slow (struggling on bad wifi), and only flash the green tick when
// queued kebabs have actually just drained to zero. When all is well it's a
// steady, quiet dot that never moves — no jitter.
export function SyncBadge({ theme, online, syncing, pendingCount, onClick }) {
  const T = theme;

  // Treat a sync as worth showing only if it drags on past ~1s. Fast heartbeat
  // round-trips finish well under that, so they never flip the badge.
  const [slowSync, setSlowSync] = useState(false);
  useEffect(() => {
    if (!syncing) { setSlowSync(false); return; }
    const t = setTimeout(() => setSlowSync(true), 1000);
    return () => clearTimeout(t);
  }, [syncing]);

  // Flash a brief green tick only when queued kebabs actually went from some → 0
  // (a real "your kebab reached the pod" moment), not on every background pull.
  const [flushed, setFlushed] = useState(false);
  const prevPending = useRef(pendingCount);
  useEffect(() => {
    if (prevPending.current > 0 && pendingCount === 0 && online) {
      setFlushed(true);
      prevPending.current = pendingCount;
      const t = setTimeout(() => setFlushed(false), 1600);
      return () => clearTimeout(t);
    }
    prevPending.current = pendingCount;
  }, [pendingCount, online]);

  let label = '';
  let color = T.muted;
  let icon = 'cloud';
  let loud = false; // loud = fully opaque + labelled; quiet = a dim, steady dot

  if (!online) {
    label = 'OFFLINE'; color = T.red; icon = 'bolt'; loud = true;
  } else if (pendingCount > 0) {
    label = `+${pendingCount} Q`; color = T.gold; loud = true;
  } else if (slowSync) {
    label = 'SYNC…'; color = T.gold; loud = true;
  } else if (flushed) {
    label = 'SYNCED'; color = T.green; loud = true;
  }
  // else: online and all caught up → a quiet, unchanging dot.

  return (
    <button
      onClick={onClick}
      title={
        !online
          ? 'Offline — your kebabs are saved and will sync automatically'
          : pendingCount > 0
            ? `${pendingCount} kebab${pendingCount === 1 ? '' : 's'} waiting to sync`
            : 'Synced with the pod'
      }
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
        opacity: loud ? 1 : 0.5,
        transition: 'opacity 0.4s, border-color 0.4s',
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
