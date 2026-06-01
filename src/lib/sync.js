// Sync layer — pushes pending kebabs and pulls new ones from the crew.
//
// Design: every kebab is an immutable event with a unique id and a timestamp.
// Local state is the authoritative copy on this device. Sync is best-effort:
// on success we push our queued events and merge any newer events we don't have yet.
// On failure (offline, slow Croatian wifi, edge function 500) we keep them queued
// and retry — the user never sees a sync error and never loses a kebab.

const SYNC_URL = '/api/sync';

export async function syncOnce({ tripCode, kebabs, lastSyncTs, signal }) {
  if (!tripCode) throw new Error('no trip code');

  const res = await fetch(SYNC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tripCode, kebabs: kebabs || [], lastSyncTs: lastSyncTs || 0 }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`sync failed: ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }

  return await res.json();
}

// Merge two arrays of immutable kebab events. Dedupe by id; newer wins
// (although since events are immutable, "newer" rarely matters).
export function mergeFeed(local, incoming) {
  const map = new Map();
  for (const k of local) map.set(k.id, k);
  for (const k of incoming) {
    const existing = map.get(k.id);
    if (!existing || (k.ts || 0) >= (existing.ts || 0)) {
      // Keep "pending" flag local-only — don't let server overwrite it.
      const merged = { ...k };
      if (existing && existing.pending && existing.ts === merged.ts) {
        merged.pending = existing.pending;
      } else {
        delete merged.pending;
      }
      map.set(k.id, merged);
    }
  }
  // Sort newest first by ts.
  return Array.from(map.values()).sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

// Strip local-only fields before sending over the wire.
export function sanitizeForSync(k) {
  const { pending, ...rest } = k;
  return rest;
}

// Returns a promise that resolves when the network goes online,
// or immediately if already online.
export function waitForOnline() {
  if (navigator.onLine !== false) return Promise.resolve();
  return new Promise(resolve => {
    const handler = () => { window.removeEventListener('online', handler); resolve(); };
    window.addEventListener('online', handler);
  });
}

// Backoff helper for the periodic sync loop.
export function nextBackoff(prev, max = 60_000) {
  return Math.min((prev || 1000) * 2, max);
}
