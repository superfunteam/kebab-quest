// Roster + helpers.
//
// The crew is a FIXED roster of the friend group — everyone gets a slot whether
// they're actively logging or not. No passwords: on this device you "claim" one
// of these names during onboarding and that's who you are. No demo kebabs — the
// trip starts empty.

const ROSTER = [
  'Clark', 'Angie', 'Matt', 'Sophia', 'David', 'Kiira', 'Brandon',
  'Melissa', 'Claire', 'Mike', 'Marion', 'Asia', 'Kathy', 'Dino',
];
const COLORS = ['gold', 'red', 'blue', 'green', 'accent'];

// Each player gets a default pixel avatar (1-based index into /avatars/IconN.png).
// They can re-pick during onboarding; this is just the starting face.
export const DEFAULT_CREW = ROSTER.map((name, i) => ({
  name: name.toUpperCase(),
  kebabs: 0,
  streak: 0,
  color: COLORS[i % COLORS.length],
  avatar: i + 1,
}));

export const ROSTER_NAMES = DEFAULT_CREW.map(c => c.name);

// No demo kebabs — clean slate for the real trip.
export const SEED_FEED = [];

// One shared trip — the whole pod syncs to this single partition. No per-trip
// codes; everyone is automatically on the main trip.
export const TRIP_CODE = 'KQPOD2026';

// Fixed trip: leave Jun 4, return Jun 21 (inclusive) = 18 days.
export const TRIP_DAYS = 18;
export const TRIP_LABEL = 'JUN 4 – JUN 21';

export const FREEZES = 2;

// The local calendar-day number for a timestamp (days since the epoch, local tz).
export function localDayNum(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return Math.round(d.getTime() / 86400000);
}

// Current streak for ANY player, derived purely from the shared feed: consecutive
// local days (through today, or yesterday if they haven't eaten yet today) on which
// they have >=1 kebab — OR a frozen/cheat day. Because it reads the feed, a kebab
// logged FOR someone by a friend counts toward THAT person's streak, on every device.
// `frozenDays` (epoch-day numbers) are that player's synced cheat days, so a freeze
// protects their streak everywhere — pass the right player's days from the synced map.
export function streakFromFeed(feed, name, frozenDays) {
  const frozen = frozenDays instanceof Set ? frozenDays : new Set(frozenDays || []);
  const ate = new Set();
  for (const f of feed) {
    if (!f.deleted && f.player === name && f.ts) ate.add(localDayNum(f.ts));
  }
  if (!ate.size && !frozen.size) return 0;
  const active = (d) => ate.has(d) || frozen.has(d);
  const today = localDayNum(Date.now());
  let start = active(today) ? today : (active(today - 1) ? today - 1 : null);
  if (start == null) return 0;
  let streak = 0;
  let d = start;
  while (active(d)) { streak++; d--; }
  return streak;
}

// Build the personal day-grid (for the STREAK calendar) straight from the feed:
// one cell per calendar day from your first kebab through today, each with your
// kebab count that day + whether it's frozen. Last cell is always today.
export function buildDaysFromFeed(feed, name, frozenDays = [], tripDays = 14) {
  const frozen = new Set(frozenDays);
  const ateByDay = new Map();
  for (const f of feed) {
    if (f.deleted || f.player !== name || !f.ts) continue;
    const d = localDayNum(f.ts);
    ateByDay.set(d, (ateByDay.get(d) || 0) + 1);
  }
  const today = localDayNum(Date.now());
  const marked = [...ateByDay.keys(), ...frozen];
  const firstDay = marked.length ? Math.min(...marked, today) : today;
  const span = today - firstDay + 1;
  const len = Math.max(1, Math.min(span, tripDays));
  const start = today - len + 1; // keep "today" as the final cell
  const days = [];
  for (let i = 0; i < len; i++) {
    const d = start + i;
    days.push({ count: ateByDay.get(d) || 0, frozen: frozen.has(d) });
  }
  return days;
}

// Stats for the personal grid. cur uses the same today-or-yesterday rule as
// streakFromFeed so the STREAK tab and the HQ panel always agree.
export function computeStreak(days) {
  const active = (i) => i >= 0 && i < days.length && (days[i].count > 0 || days[i].frozen);
  const n = days.length;
  let start = active(n - 1) ? n - 1 : (active(n - 2) ? n - 2 : -1);
  let cur = 0;
  if (start >= 0) { let i = start; while (active(i)) { cur++; i--; } }
  let longest = 0;
  let run = 0;
  days.forEach(d => {
    if (d.count > 0 || d.frozen) { run++; longest = Math.max(longest, run); }
    else run = 0;
  });
  const kebabs = days.reduce((s, d) => s + d.count, 0);
  const eaten = days.filter(d => d.count > 0).length;
  return { cur, longest, kebabs, eaten };
}
