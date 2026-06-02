// All-synth sound effects via the Web Audio API — nothing is loaded from disk,
// every blip/crunch/fanfare is generated on the fly. Keeps the bundle tiny and
// the retro feel hand-made.
//
// Usage: import { sfx } from './lib/sound.js' and call sfx.munch(), sfx.pop(),
// etc. from event handlers. Call sfx.init() inside the first user gesture
// (Press Start) so the AudioContext is unlocked on mobile browsers.

let ctx = null;
let master = null;
let enabled = true;

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
  }
  // Browsers suspend the context until a gesture — resume on every play attempt
  // (cheap no-op when already running). The first call happens inside a click,
  // so the resume is allowed.
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Run a sound builder, swallowing any audio errors so a bad sound never breaks
// the UI and skipping entirely when muted.
function play(builder) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  try { builder(c); } catch (_) { /* never let audio crash the app */ }
}

// A single shaped oscillator note with an attack/decay envelope and optional
// pitch glide (for boings/pops).
function tone(c, { freq, type = 'square', start = 0, dur = 0.15, gain = 0.3, glideTo = null, attack = 0.005 }) {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// A short burst of filtered white noise — the building block for crunches.
function noiseBurst(c, { start = 0, dur = 0.08, gain = 0.4, type = 'lowpass', freq = 1000, q = 1 }) {
  const t0 = c.currentTime + start;
  const frames = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = type;
  filt.frequency.value = freq;
  filt.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function haptic(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (_) { /* unsupported */ }
}

export const sfx = {
  // Unlock audio + remember the user's preference.
  init() { getCtx(); },
  setEnabled(v) { enabled = !!v; if (enabled) getCtx(); },
  isEnabled() { return enabled; },
  haptic,

  // PRESS START — cheerful ascending "doodle-do" with a sparkly flourish.
  intro() {
    play(c => {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      notes.forEach((f, i) => tone(c, { freq: f, type: 'square', start: i * 0.085, dur: 0.13, gain: 0.2 }));
      tone(c, { freq: 1046.5, type: 'square', start: 0.40, dur: 0.10, gain: 0.2 });
      tone(c, { freq: 1318.51, type: 'square', start: 0.50, dur: 0.26, gain: 0.22 }); // E6 hold
      tone(c, { freq: 1567.98, type: 'triangle', start: 0.50, dur: 0.30, gain: 0.1 }); // sparkle
    });
    haptic(20);
  },

  // EAT KEBAB — three crispy "crunch crunch crunch" chews of filtered noise.
  munch() {
    play(c => {
      for (let k = 0; k < 3; k++) {
        const base = k * 0.105;
        noiseBurst(c, { start: base, dur: 0.055, gain: 0.32, type: 'lowpass', freq: 800 + Math.random() * 400, q: 1 });
        noiseBurst(c, { start: base + 0.022, dur: 0.05, gain: 0.22, type: 'bandpass', freq: 450 + Math.random() * 250, q: 2.5 });
        // a tiny low thud per bite for the meaty body
        tone(c, { freq: 110 + Math.random() * 30, type: 'square', start: base, dur: 0.05, gain: 0.12, glideTo: 60 });
      }
    });
    haptic([12, 40, 12, 40, 12]);
  },

  // SAVE REVIEW — triumphant little horn fanfare (ta-da-DAA).
  success() {
    play(c => {
      const horn = (f, start, dur, gain = 0.16) => {
        tone(c, { freq: f, type: 'sawtooth', start, dur, gain, attack: 0.012 });
        tone(c, { freq: f * 1.006, type: 'sawtooth', start, dur, gain: gain * 0.55, attack: 0.012 }); // detune = fatter
      };
      horn(392.0, 0.0, 0.13);  // G4
      horn(392.0, 0.15, 0.13); // G4
      horn(523.25, 0.30, 0.5); // C5 hold
      horn(659.25, 0.30, 0.5, 0.13); // E5
      horn(783.99, 0.30, 0.5, 0.1);  // G5
    });
    haptic([15, 30, 60]);
  },

  // Interface fiddling (name, avatar arrows) — a quick two-tone "blip-blop".
  blip() {
    play(c => {
      tone(c, { freq: 987.77, type: 'square', start: 0, dur: 0.05, gain: 0.16 });  // B5
      tone(c, { freq: 659.25, type: 'square', start: 0.055, dur: 0.06, gain: 0.16 }); // E5
    });
  },

  // Avatar shuffle / random — a rapid little riffle of blips.
  shuffle() {
    play(c => {
      const fs = [784, 988, 1175, 988, 784];
      fs.forEach((f, i) => tone(c, { freq: f, type: 'square', start: i * 0.04, dur: 0.045, gain: 0.13 }));
    });
    haptic([8, 20, 8, 20, 8]);
  },

  // Tab switch — a snappy "click pop".
  pop() {
    play(c => {
      tone(c, { freq: 520, type: 'triangle', start: 0, dur: 0.07, gain: 0.28, glideTo: 1180 });
    });
    haptic(8);
  },

  // Settings toggles — a springy "doink/boink".
  boink() {
    play(c => {
      tone(c, { freq: 680, type: 'triangle', start: 0, dur: 0.22, gain: 0.3, glideTo: 150 });
      tone(c, { freq: 340, type: 'sine', start: 0.02, dur: 0.2, gain: 0.12, glideTo: 90 });
    });
    haptic(18);
  },

  // Streak freeze — an icy descending shimmer.
  freeze() {
    play(c => {
      tone(c, { freq: 1318.51, type: 'triangle', start: 0, dur: 0.5, gain: 0.16, glideTo: 660 });
      tone(c, { freq: 1975.53, type: 'sine', start: 0.05, dur: 0.45, gain: 0.07, glideTo: 990 });
    });
    haptic([10, 20, 10]);
  },

  // Chain scroll — a low "tick" stretch, fired repeatedly while dragging.
  tick() {
    play(c => {
      tone(c, { freq: 150, type: 'square', start: 0, dur: 0.022, gain: 0.1 });
    });
    haptic(6);
  },
};
