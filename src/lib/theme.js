// Theme + voice — direct port from the design.

export const PALETTES = {
  'Arcade': {
    bg0: '#0c0a1e', bg1: '#141031', surf: '#1e1842', surf2: '#2b2257', line: '#473c82',
    text: '#fdf6e3', muted: '#9b8fd4',
    gold: '#ffd23f', red: '#ff4d6d', blue: '#42b9ff', green: '#4fe37a', accent: '#ff4d6d',
    mono: false,
  },
  'Game Boy': {
    bg0: '#0f380f', bg1: '#13441a', surf: '#1b5121', surf2: '#26602a', line: '#326230',
    text: '#9bbc0f', muted: '#6f9a36',
    gold: '#9bbc0f', red: '#8bac0f', blue: '#8bac0f', green: '#9bbc0f', accent: '#9bbc0f',
    mono: true,
  },
  'Super 16': {
    bg0: '#1a1033', bg1: '#241546', surf: '#312060', surf2: '#3f2a78', line: '#5b3fa6',
    text: '#f3ecff', muted: '#a690d6',
    gold: '#ffcf4d', red: '#ff5d8f', blue: '#5cc8ff', green: '#5be3a0', accent: '#b46bff',
    mono: false,
  },
  'Commodore': {
    bg0: '#241a8c', bg1: '#2e2596', surf: '#3a30a8', surf2: '#473cba', line: '#7c70da',
    text: '#cfc7ff', muted: '#9d92e8',
    gold: '#fff04d', red: '#ff6e6e', blue: '#8fd4ff', green: '#7be38f', accent: '#ffd24d',
    mono: false,
  },
};

export function makeTheme(name) {
  return PALETTES[name] || PALETTES['Arcade'];
}

export const VOICE = {
  hype: {
    cta: 'EAT KEBAB', scoreLabel: 'POD SCORE', streakLabel: 'STREAK',
    todayPrompt: 'INSERT KEBAB TO CONTINUE', done: 'YUM! +1 POD SCORE',
    mapTitle: 'WORLD MAP', mapSub: 'GERMANY ▸ CROATIA',
    boss: 'DUBROVNIK', bossSub: 'FINAL BOSS', finish: 'KEBAB CHAMPIONS',
    chainTitle: 'THE CHAIN', chainSub: 'EVERY KEBAB, LINKED',
    streakTitle: 'YOUR STREAK', streakSub: 'KEEP IT LIT, KEBAB KING',
  },
  dry: {
    cta: 'EAT KEBAB', scoreLabel: 'POD TOTAL', streakLabel: 'STREAK',
    todayPrompt: 'No kebab logged today.', done: '+1. Logged.',
    mapTitle: 'WORLD MAP', mapSub: 'Germany to Croatia',
    boss: 'DUBROVNIK', bossSub: 'Final stop', finish: 'Trip complete',
    chainTitle: 'The Chain', chainSub: 'Every kebab, linked',
    streakTitle: 'Your Streak', streakSub: 'Eat one a day to keep it.',
  },
};

export const POW_WORDS = ['POW!', 'YUM!', 'NICE!', 'BOOM!', 'TASTY!', 'OISHII!', 'MUNCH!'];

export const formatEuro = (n) =>
  '€' + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '');

export const colorOf = (T, key) => T[key] || T.accent;

// Page-title drop shadow. A coloured offset pops in the vibrant palettes, but in
// the mono Game Boy palette the text and accent are the same green, which just
// smears the letters — so fall back to the dark base there for a crisp, readable
// edge (matching the onboarding / confirm-modal titles).
export const titleShadow = (T, px = 2) => `${px}px ${px}px 0 ${T.mono ? T.bg0 : T.accent}`;
