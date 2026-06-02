// Kebab Quest sync — Netlify Edge Function backed by Netlify Blobs.
//
// Contract: POST /api/sync { tripCode, kebabs[], lastSyncTs }
//
// The whole crew shares one immutable event log per trip code (a blob keyed
// `trip:<TRIPCODE>`). Each client sends:
//   - any new kebabs the user has logged since the last sync (deduped by id)
//   - the highest server timestamp it has seen so far
//
// We append-and-dedupe, then return any events whose server-side ts is greater
// than the client's lastSyncTs — that gives them whatever other crew members
// logged in the meantime, in one round trip.
//
// Edge runtime: globally distributed so users on a Croatian island still get
// fast sync from the nearest PoP. Blobs are eventually consistent but a single
// edge node serves a given key, so simultaneous writes from one crew should be
// rare in practice — and even if two clients collide, the worst case is one
// retry on the next heartbeat.

import { getStore } from '@netlify/blobs';

const MAX_TRIP_CODE = 24;
const MAX_KEBABS_PER_REQUEST = 200;
const MAX_HISTORY = 5000;

export default async (request, context) => {
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'invalid_json' }, 400);
  }

  const tripCode = sanitizeTripCode(body?.tripCode);
  if (!tripCode) return json({ error: 'invalid_trip_code' }, 400);

  const incoming = Array.isArray(body?.kebabs) ? body.kebabs : [];
  if (incoming.length > MAX_KEBABS_PER_REQUEST) {
    return json({ error: 'too_many_kebabs', max: MAX_KEBABS_PER_REQUEST }, 413);
  }
  const clean = incoming.map(sanitizeKebab).filter(Boolean);

  const lastSyncTs = Number(body?.lastSyncTs) || 0;

  const store = getStore({ name: 'kebab-quest', consistency: 'strong' });
  const key = `trip:${tripCode}`;

  // Clark-only reset: wipe the shared log for the whole pod.
  if (body?.reset === true) {
    await store.setJSON(key, []);
    return json({ kebabs: [], ts: 0, total: 0, ack: [] });
  }

  const ver = (k) => (k && (k.updatedAt || k.ts)) || 0;

  // Upsert with optimistic concurrency, so two phones logging at the same moment
  // never clobber each other (which would silently drop one person's kebab).
  // Read-with-etag → merge → conditional write; retry on conflict. Falls back to a
  // plain read-modify-write if the runtime lacks conditional writes.
  let updated = [];
  let wrote = false;
  for (let attempt = 0; attempt < 8 && !wrote; attempt++) {
    let existing = [];
    let etag = null;
    let cas = true;
    try {
      const meta = await store.getWithMetadata(key, { type: 'json' });
      existing = (meta && meta.data) || [];
      etag = (meta && meta.etag) || null;
    } catch (_) {
      cas = false;
      existing = (await store.get(key, { type: 'json' })) || [];
    }

    const byId = new Map(existing.map(k => [k.id, k]));
    const now = Date.now();
    let bump = 0;
    let changed = false;
    for (const k of clean) {
      // New ids inserted; existing ids replaced only when the incoming version is
      // newer (edits/deletes carry a higher updatedAt). serverTs = monotonic clock.
      const prev = byId.get(k.id);
      if (!prev || ver(k) > ver(prev)) {
        byId.set(k.id, { ...k, serverTs: now + (bump++) });
        changed = true;
      }
    }
    updated = Array.from(byId.values()); // Map preserves order
    if (updated.length > MAX_HISTORY) updated = updated.slice(updated.length - MAX_HISTORY);

    if (!changed) { wrote = true; break; } // nothing new to persist
    if (!cas) { await store.setJSON(key, updated); wrote = true; break; }
    try {
      const res = etag
        ? await store.setJSON(key, updated, { onlyIfMatch: etag })
        : await store.setJSON(key, updated, { onlyIfNew: true });
      if (res && res.modified === false) continue; // another writer beat us → retry
      wrote = true;
    } catch (_) {
      await store.setJSON(key, updated); // conditional writes unsupported → plain write
      wrote = true;
    }
  }
  if (!wrote) return json({ error: 'write_conflict' }, 503); // client keeps it queued

  // Tell the caller about every kebab they haven't seen yet + ack what we stored.
  const newSinceClient = updated.filter(k => (k.serverTs || k.ts || 0) > lastSyncTs);
  const maxServerTs = updated.reduce((m, k) => Math.max(m, k.serverTs || k.ts || 0), lastSyncTs);

  return json({
    kebabs: newSinceClient,
    ts: maxServerTs,
    total: updated.length,
    ack: clean.map(k => k.id),
  });
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function sanitizeTripCode(s) {
  if (typeof s !== 'string') return null;
  const clean = s.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!clean || clean.length > MAX_TRIP_CODE) return null;
  return clean;
}

function sanitizeKebab(k) {
  if (!k || typeof k !== 'object') return null;
  if (typeof k.id !== 'string' || k.id.length < 4 || k.id.length > 64) return null;
  const ts = Number(k.ts);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  return {
    id: k.id,
    player: clip(k.player, 24),
    avatar: clampInt(k.avatar, 1, 48),
    city: clip(k.city, 40),
    cc: clip(k.cc, 3),
    rating: clampInt(k.rating, 0, 5),
    meat: clip(k.meat, 16),
    price: clampNumber(k.price, 0, 9999),
    note: clip(k.note, 280),
    shop: clip(k.shop, 80),
    photo: !!k.photo,
    when: clip(k.when, 40),
    ts,
    updatedAt: Number(k.updatedAt) > 0 ? Number(k.updatedAt) : undefined,
    deleted: k.deleted ? true : undefined,
  };
}

function clip(s, max) {
  if (s == null) return '';
  return String(s).slice(0, max);
}
function clampInt(n, min, max) {
  const x = Math.round(Number(n) || 0);
  return Math.max(min, Math.min(max, x));
}
function clampNumber(n, min, max) {
  const x = Number(n) || 0;
  return Math.max(min, Math.min(max, x));
}

export const config = { path: '/api/sync' };
