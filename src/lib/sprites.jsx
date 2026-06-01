// Pixel sprite engine — renders a char grid as crisp SVG rects.

import React from 'react';

export function PixelSprite({ grid, palette, scale = 4, style, className }) {
  const rows = grid.replace(/^\n+|\n+$/g, '').split('\n');
  const h = rows.length;
  const w = Math.max(...rows.map(r => r.length));
  const rects = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const c = palette[ch];
      if (!c) continue;
      rects.push(
        <rect key={x + '_' + y} x={x} y={y} width={1.04} height={1.04} fill={c} />
      );
    }
  });
  return (
    <svg
      className={className}
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      style={{ display: 'block', imageRendering: 'pixelated', ...style }}
    >
      {rects}
    </svg>
  );
}

// The hero — a foil-wrapped döner kebab.
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

const KEBAB_PAL = {
  g: '#7ed957', G: '#5fbf3a',
  M: '#8b4a2b', m: '#b9663a', R: '#e8453c', o: '#d98a2b',
  W: '#e3a857', w: '#f5c97d',
  F: '#c6ccda', f: '#969eb0',
  O: '#241307',
};

// Classic Game Boy DMG 4-shade ramp (dark → light).
const GB_SHADES = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'];

function luminance(hex) {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Collapse the full-colour kebab onto a mono ramp by luminance, so the hero
// sprite goes monotone-green in the Game Boy palette like everything else.
function monoizePalette(pal, shades) {
  const out = {};
  for (const k in pal) {
    const idx = Math.min(shades.length - 1, Math.floor(luminance(pal[k]) * shades.length));
    out[k] = shades[idx];
  }
  return out;
}

const KEBAB_PAL_GB = monoizePalette(KEBAB_PAL, GB_SHADES);

// Pass a `theme`; mono palettes (Game Boy) get the green-ramped kebab.
export function KebabSprite({ scale = 4, style, theme }) {
  const palette = theme && theme.mono ? KEBAB_PAL_GB : KEBAB_PAL;
  return <PixelSprite grid={KEBAB_GRID} palette={palette} scale={scale} style={style} />;
}

// Mono icons — single-color pixel glyphs (X = filled).
const ICONS = {
  home: `
....X....
...XXX...
..XXXXX..
.XXXXXXX.
XXXXXXXXX
.XX...XX.
.XX.X.XX.
.XX.X.XX.
.XX.X.XX.`,
  map: `
XX.XXX.XXX
XX.X.X.X.X
XX.X.X.X.X
XX.XXX.XXX
XX.......X
XX.XXX.X.X
XX.X.X.X.X
XX.X.X.XXX
XXXXXXXXXX`,
  crew: `
.XX...XX.
.XX...XX.
.XX...XX.
.........
XXXX.XXXX
XXXX.XXXX
XXXX.XXXX
XXXX.XXXX
.XXX.XXX.`,
  scroll: `
.XXXXXXX.
XX.....XX
.XXXXXXX.
.X.....X.
.X.XXX.X.
.X.....X.
.X.XXX.X.
.XXXXXXX.
XX.....XX`,
  flame: `
...X....
...XX...
..X.X...
..X..X..
.X...X..
.X.X.X..
.X.XX.X.
..X..X..
..XXXX..`,
  star: `
...X...
...X...
..XXX..
XXXXXXX
.XXXXX.
.XX.XX.
XX...XX`,
  coin: `
..XXXX..
.XXXXXX.
XX.XX.XX
XX.XX.XX
XX.XX.XX
XX.XX.XX
.XXXXXX.
..XXXX..`,
  crown: `
X..X..X
X.XXX.X
XXXXXXX
XXXXXXX
X.X.X.X
XXXXXXX`,
  lock: `
.XXXX.
X....X
X....X
XXXXXX
XX..XX
XXXXXX
XXXXXX`,
  check: `
......X
.....XX
X...XX.
XX.XX..
.XXX...
..X....`,
  castle: `
X.X.X.X.X
XXXXXXXXX
XXXXXXXXX
XX.XXX.XX
XX.X.X.XX
XXXXXXXXX
XX.XXX.XX
XXXXXXXXX`,
  pin: `
.XXXX.
XX..XX
X.XX.X
X.XX.X
XX..XX
.XXXX.
..XX..
..XX..`,
  heart: `
.XX.XX.
XXXXXXX
XXXXXXX
.XXXXX.
..XXX..
...X...`,
  snow: `
...X...
.X.X.X.
..XXX..
XXXXXXX
..XXX..
.X.X.X.
...X...`,
  cross: `
X.....X
XX...XX
.XX.XX.
..XXX..
.XX.XX.
XX...XX
X.....X`,
  link: `
.XXX...
X...X..
X..XXX.
XXX..X.
.X..XXX
..XXX.X
....XXX`,
  cloud: `
..XXXX..
.XXXXXX.
XXXXXXXX
XXXXXXXX
XXXXXXXX
.X.X.X.X`,
  bolt: `
...XXX..
..XXX...
.XXXX...
XXXXXXXX
....XXX.
...XXX..
..XXX...`,
  gear: `
..X.X..
.XXXXX.
X..X..X
XX...XX
X..X..X
.XXXXX.
..X.X..`,
};

export function MonoIcon({ name, size = 22, color = '#fff', style }) {
  const grid = ICONS[name] || ICONS.coin;
  const rows = grid.replace(/^\n+|\n+$/g, '').split('\n');
  const w = Math.max(...rows.map(r => r.length));
  const scale = size / w;
  return <PixelSprite grid={grid} palette={{ X: color }} scale={scale} style={style} />;
}

export function PixelStars({ value = 0, size = 12, color = '#ffd23f', dim = '#3a3263', onChange, gap }) {
  return (
    <div style={{ display: 'flex', gap: gap != null ? gap : size * 0.3 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <div
          key={n}
          onClick={onChange ? () => onChange(n) : undefined}
          style={{ cursor: onChange ? 'pointer' : 'default', lineHeight: 0 }}
        >
          <MonoIcon name="star" size={size} color={n <= value ? color : dim} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AVATARS — 48 pixel-art portraits in /public/avatars/IconN.png
// ─────────────────────────────────────────────────────────────
export const AVATAR_COUNT = 48;

export function avatarUrl(n) {
  let i = Number(n);
  if (!Number.isFinite(i) || i < 1) i = 1;
  if (i > AVATAR_COUNT) i = ((Math.round(i) - 1) % AVATAR_COUNT) + 1;
  return `/avatars/Icon${Math.round(i)}.png`;
}

// A player's pixel-art face. Falls back to a generic frame if the image is missing.
export function Avatar({ n, size = 32, theme, style, borderColor }) {
  const T = theme;
  const bc = borderColor || (T ? T.line : '#000');
  return (
    <img
      src={avatarUrl(n)}
      width={size}
      height={size}
      alt=""
      draggable={false}
      style={{
        display: 'block',
        width: size,
        height: size,
        imageRendering: 'pixelated',
        objectFit: 'cover',
        background: T ? T.bg0 : '#000',
        border: `2px solid ${bc}`,
        boxSizing: 'border-box',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
