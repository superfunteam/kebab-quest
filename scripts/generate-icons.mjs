// Renders the pixel kebab to PNG manifest icons. Pure Node (zlib + Buffer),
// no npm deps. Run with `node scripts/generate-icons.mjs` after editing the grid.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT_DIR, { recursive: true });

const KEBAB_GRID = `
.....ggg.....
....gMRMg....
...gMRmMRg...
..gMmMRMmMg..
.OOWwWwWwWOO.
.OWwWoWoWwWO.
.OwWwWwWwWwO.
.OWwWwWwWwWO.
.OwWoWwWoWwO.
.OWwWwWwWwWO.
.OFfFfFfFfFO.
.OfFfFfFfFfO.
..OFfFfFfFO..
...OOFfFOO...
.....OOO.....
`;
const KEBAB_PAL_FULL = {
  g: [0x7e, 0xd9, 0x57],
  M: [0x8b, 0x4a, 0x2b], m: [0xb9, 0x66, 0x3a], R: [0xe8, 0x45, 0x3c], o: [0xd9, 0x8a, 0x2b],
  W: [0xe3, 0xa8, 0x57], w: [0xf5, 0xc9, 0x7d],
  F: [0xc6, 0xcc, 0xda], f: [0x96, 0x9e, 0xb0],
  O: [0x24, 0x13, 0x07],
};

// Game Boy "screen" look: dark kebab on a lit yellow-green LCD, dark frame.
// Map the full-colour kebab onto the 3 darkest DMG shades by luminance so it
// reads dark-on-light like a real Game Boy sprite.
const GB_DARK = [0x0f, 0x38, 0x0f];   // darkest
const GB_MID  = [0x30, 0x62, 0x30];   // dark
const GB_LITE = [0x8b, 0xac, 0x0f];   // mid
const GB_SCREEN = [0x9b, 0xbc, 0x0f]; // lightest — the lit LCD background
const KEBAB_SHADES = [GB_DARK, GB_MID, GB_LITE];

function lum(rgb) {
  return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
}
const KEBAB_PAL = Object.fromEntries(
  Object.entries(KEBAB_PAL_FULL).map(([k, rgb]) => {
    const idx = Math.min(KEBAB_SHADES.length - 1, Math.floor(lum(rgb) * KEBAB_SHADES.length));
    return [k, KEBAB_SHADES[idx]];
  })
);
const BG = GB_SCREEN;          // lit Game Boy LCD
const BG_RING_DARK = GB_DARK;  // dark frame around the screen

function renderKebab(size) {
  // Parse the pixel grid into a 2D array.
  const rows = KEBAB_GRID.replace(/^\n+|\n+$/g, '').split('\n');
  const gh = rows.length;
  const gw = Math.max(...rows.map(r => r.length));

  // Reserve a margin so the kebab doesn't touch the edge; round to pixel grid.
  const margin = Math.floor(size * 0.16);
  const drawSize = size - margin * 2;
  // Pick the largest integer scale that fits.
  const scale = Math.max(1, Math.floor(Math.min(drawSize / gw, drawSize / gh)));
  const renderedW = gw * scale;
  const renderedH = gh * scale;
  const offsetX = Math.floor((size - renderedW) / 2);
  const offsetY = Math.floor((size - renderedH) / 2);

  // Allocate RGBA buffer, fill background.
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    buf[i * 4 + 0] = BG[0];
    buf[i * 4 + 1] = BG[1];
    buf[i * 4 + 2] = BG[2];
    buf[i * 4 + 3] = 0xff;
  }

  // Outer border ring (2px) for definition on light backgrounds.
  const ringWidth = Math.max(2, Math.round(size / 64));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inRing = x < ringWidth || y < ringWidth || x >= size - ringWidth || y >= size - ringWidth;
      if (!inRing) continue;
      const i = (y * size + x) * 4;
      buf[i] = BG_RING_DARK[0]; buf[i + 1] = BG_RING_DARK[1]; buf[i + 2] = BG_RING_DARK[2];
    }
  }

  // Draw the kebab pixel by pixel.
  for (let gy = 0; gy < gh; gy++) {
    const row = rows[gy];
    for (let gx = 0; gx < row.length; gx++) {
      const ch = row[gx];
      const col = KEBAB_PAL[ch];
      if (!col) continue;
      const px = offsetX + gx * scale;
      const py = offsetY + gy * scale;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const x = px + dx;
          const y = py + dy;
          if (x < 0 || x >= size || y < 0 || y >= size) continue;
          const i = (y * size + x) * 4;
          buf[i] = col[0]; buf[i + 1] = col[1]; buf[i + 2] = col[2]; buf[i + 3] = 0xff;
        }
      }
    }
  }

  return buf;
}

// Minimal PNG encoder (RGBA, no filtering — filter byte = 0 per row).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff >>> 0;
  for (let i = 0; i < buf.length; i++) c = (CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(rgba, size) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Pixel data: prepend filter byte (0) to each row.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });

  const magic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    magic,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const rgba = renderKebab(size);
  const png = encodePNG(rgba, size);
  const path = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(path, png);
  console.log(`  wrote ${path} (${png.length} bytes)`);
}

// favicon.svg — inline pixel kebab, no external deps, scales crisp.
const SVG_PATH = join(__dirname, '..', 'public', 'favicon.svg');
const rows = KEBAB_GRID.replace(/^\n+|\n+$/g, '').split('\n');
const gw = Math.max(...rows.map(r => r.length));
const gh = rows.length;
const rects = [];
rows.forEach((row, y) => {
  for (let x = 0; x < row.length; x++) {
    const ch = row[x];
    const c = KEBAB_PAL[ch];
    if (!c) continue;
    const hex = '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
    rects.push(`<rect x="${x}" y="${y}" width="1.04" height="1.04" fill="${hex}"/>`);
  }
});
const bgHex = '#' + BG.map(v => v.toString(16).padStart(2, '0')).join('');
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${gw + 2} ${gh + 2}" shape-rendering="crispEdges">` +
  `<rect x="-1" y="-1" width="${gw + 2}" height="${gh + 2}" fill="${bgHex}"/>` +
  rects.join('') +
  `</svg>`;
writeFileSync(SVG_PATH, svg);
console.log(`  wrote ${SVG_PATH} (${svg.length} bytes)`);
