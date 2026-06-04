// Sync layer — pushes pending kebabs and pulls new ones from the crew.
//
// Design: every kebab is an immutable event with a unique id and a timestamp.
// Local state is the authoritative copy on this device. Sync is best-effort:
// on success we push our queued events and merge any newer events we don't have yet.
// On failure (offline, slow Croatian wifi, edge function 500) we keep them queued
// and retry — the user never sees a sync error and never loses a kebab.

const SYNC_URL = '/api/sync';

export async function syncOnce({ tripCode, kebabs, lastSyncTs, claim, frozen, release, signal }) {
  if (!tripCode) throw new Error('no trip code');

  const body = { tripCode, kebabs: kebabs || [], lastSyncTs: lastSyncTs || 0 };
  if (claim) body.claim = claim; // ride-along identity claim (name + avatar)
  if (frozen && Array.isArray(frozen.days) && frozen.days.length) body.frozen = frozen; // streak cheat days
  if (release) body.releaseClaim = release; // "reset my character": free this name + avatar

  const res = await fetch(SYNC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

// Clark-only "reset all kebabs": wipe the shared trip log on the server.
export async function resetTripServer(tripCode) {
  if (!tripCode) return;
  const res = await fetch(SYNC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tripCode, reset: true }),
  });
  if (!res.ok) throw new Error(`reset failed: ${res.status}`);
  return await res.json();
}

// Merge two arrays of kebab events. Dedupe by id; the higher "version" wins, where
// version = updatedAt (set on edit/delete) falling back to ts. This lets edits and
// deletions (tombstones) override the server's older copy.
export function mergeFeed(local, incoming) {
  const ver = (k) => (k && (k.updatedAt || k.ts)) || 0;
  const map = new Map();
  for (const k of local) map.set(k.id, k);
  for (const k of incoming) {
    const existing = map.get(k.id);
    if (!existing || ver(k) >= ver(existing)) {
      const merged = { ...k };
      // Preserve a local-only, not-yet-acked pending edit when versions match.
      if (existing && existing.pending && ver(existing) === ver(k)) {
        merged.pending = true;
      } else {
        delete merged.pending;
      }
      map.set(k.id, merged);
    }
  }
  // Sort newest first by log time.
  return Array.from(map.values()).sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

// Strip local-only fields before sending over the wire.
export function sanitizeForSync(k) {
  const { pending, ...rest } = k;
  return rest;
}

// Merge the server's authoritative claims map with our local one, keeping the
// newest claim per name (so an offline re-pick that hasn't synced yet survives).
export function mergeClaims(local, incoming) {
  const out = { ...(incoming || {}) };
  for (const name in (local || {})) {
    const l = local[name];
    if (!l) continue;
    if (!out[name] || (l.ts || 0) > (out[name].ts || 0)) out[name] = l;
  }
  return out;
}

// Merge two { NAME: [dayNum] } freeze maps by unioning each player's days —
// freezes are permanent, so a union can never lose a cheat day either side has.
export function mergeFrozen(local, incoming) {
  const out = {};
  const names = new Set([...Object.keys(local || {}), ...Object.keys(incoming || {})]);
  for (const n of names) {
    const a = Array.isArray((local || {})[n]) ? local[n] : [];
    const b = Array.isArray((incoming || {})[n]) ? incoming[n] : [];
    out[n] = Array.from(new Set([...a, ...b])).sort((x, y) => x - y);
  }
  return out;
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
