// Photo capture + upload helpers.
//
// A phone photo can be 5–12 MP / several MB. Before uploading we decode it,
// downscale to fit within MAX_DIM and re-encode as JPEG, which turns it into a
// ~100–300 KB payload — fast to send on flaky wifi and cheap to store. The
// upload returns a short URL we stash on the kebab; the bytes live in Netlify
// Blobs and load (then cache) on demand for the whole crew.

const PHOTO_ENDPOINT = '/api/photo';
const MAX_DIM = 1280;   // longest edge, px
const QUALITY = 0.82;   // JPEG quality

// A usable, shareable photo reference: our own upload URL or an absolute http(s)
// link. Guards against legacy `photo: true` booleans from before real uploads
// existed (those never pointed at an actual image).
export function isPhotoUrl(p) {
  return typeof p === 'string' && /^(\/api\/photo\?id=|https?:\/\/)/.test(p);
}

// Decode → downscale → re-encode to a JPEG Blob. If the browser can't decode the
// file (exotic format) we fall back to uploading the original bytes untouched.
export async function compressImage(file, maxDim = MAX_DIM, quality = QUALITY) {
  if (!file || !(file.type || '').startsWith('image/')) {
    throw new Error('not an image');
  }
  const bitmap = await loadImage(file).catch(() => null);
  if (!bitmap) return file; // can't decode → upload as-is and let the server keep it

  const srcW = bitmap.width || bitmap.naturalWidth;
  const srcH = bitmap.height || bitmap.naturalHeight;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);
  if (typeof bitmap.close === 'function') bitmap.close();

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
  return blob || file;
}

// Prefer createImageBitmap (handles EXIF orientation + is off-main-thread); fall
// back to an <img> + object URL on browsers that lack it.
async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (_) { /* fall through to <img> */ }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
    img.src = url;
  });
}

// Upload a Blob to the photo store, returning its shareable URL. Aborts on
// timeout so a stalled connection surfaces as a retryable error, not a hang.
export async function uploadPhoto(blob, { timeout = 30_000 } = {}) {
  const type = (blob.type || '').startsWith('image/') ? blob.type : 'image/jpeg';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(PHOTO_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': type },
      body: blob,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`upload failed: ${res.status} ${text}`);
    }
    const data = await res.json().catch(() => null);
    if (!data || !data.url) throw new Error('upload failed: malformed response');
    return data.url;
  } finally {
    clearTimeout(timer);
  }
}

// Pick → compress → upload in one shot. Returns the stored photo URL.
export async function processAndUpload(file) {
  const blob = await compressImage(file);
  return await uploadPhoto(blob);
}
