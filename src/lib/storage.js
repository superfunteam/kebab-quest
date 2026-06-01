// Thin localStorage wrapper. All reads/writes go through here so we have one
// safe place to handle missing storage (private browsing, quota errors).

const PREFIX = 'kq:';

export function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

export function clear(key) {
  try { localStorage.removeItem(PREFIX + key); return true; }
  catch (e) { return false; }
}

export function readBool(key, fallback = false) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    if (v == null) return fallback;
    return v === '1' || v === 'true';
  } catch (e) { return fallback; }
}

export function writeBool(key, value) {
  try {
    localStorage.setItem(PREFIX + key, value ? '1' : '0');
    return true;
  } catch (e) { return false; }
}

// A short, URL-safe code for the trip — generated once per device
// if a friend hasn't shared one yet. Six chars from the base32 alphabet.
export function generateTripCode() {
  const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) s += alpha[b % alpha.length];
  return s;
}

export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // Fallback for old browsers — RFC 4122 v4-ish.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
