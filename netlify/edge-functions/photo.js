// Kebab Quest photo store — Netlify Edge Function backed by Netlify Blobs.
//
// Contract:
//   POST /api/photo        raw image bytes, Content-Type: image/<jpeg|png|webp|gif>
//                          → 201 { id, url } where url = /api/photo?id=<id>
//   GET  /api/photo?id=ID  → the stored image with an immutable cache header
//
// Why a separate store from the trip log: photos are heavy. If we embedded the
// bytes in each kebab event, every sync heartbeat would re-download the whole
// gallery — brutal on the slow wifi this crew lives on. Instead each photo gets
// its own blob keyed by a random id, and the kebab only carries the short URL.
// The image then loads once and caches in the browser/CDN for the whole pod.

import { getStore } from '@netlify/blobs';

const STORE = 'kebab-photos';
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB ceiling — the client compresses well under this
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export default async (request) => {
  if (request.method === 'GET') return handleGet(request);
  if (request.method === 'POST') return handlePost(request);
  return json({ error: 'method_not_allowed' }, 405);
};

async function handlePost(request) {
  const contentType = (request.headers.get('content-type') || '')
    .split(';')[0].trim().toLowerCase();
  if (!ALLOWED.has(contentType)) {
    return json({ error: 'unsupported_type', allowed: [...ALLOWED] }, 415);
  }

  let bytes;
  try {
    bytes = await request.arrayBuffer();
  } catch (_) {
    return json({ error: 'read_failed' }, 400);
  }
  if (!bytes || bytes.byteLength === 0) return json({ error: 'empty' }, 400);
  if (bytes.byteLength > MAX_BYTES) return json({ error: 'too_large', max: MAX_BYTES }, 413);

  const id = crypto.randomUUID().replace(/-/g, '');
  const store = getStore({ name: STORE, consistency: 'strong' });
  try {
    await store.set(id, bytes, { metadata: { contentType } });
  } catch (_) {
    return json({ error: 'store_failed' }, 502);
  }
  return json({ id, url: `/api/photo?id=${id}` }, 201);
}

async function handleGet(request) {
  const url = new URL(request.url);
  // ids are hex from randomUUID; strip anything else so a bad id can't escape the key space.
  const id = (url.searchParams.get('id') || '').replace(/[^a-zA-Z0-9]/g, '');
  if (!id) return json({ error: 'missing_id' }, 400);

  const store = getStore({ name: STORE, consistency: 'strong' });
  let res = null;
  try {
    res = await store.getWithMetadata(id, { type: 'arrayBuffer' });
  } catch (_) {
    res = null;
  }
  if (!res || !res.data) return json({ error: 'not_found' }, 404);

  const contentType = (res.metadata && res.metadata.contentType) || 'application/octet-stream';
  return new Response(res.data, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      // Each id is unique + content never changes → cache hard.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

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

export const config = { path: '/api/photo' };
