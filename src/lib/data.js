// Roster + helpers.
//
// The crew is a FIXED roster of the friend group — everyone gets a slot whether
// they're actively logging or not. No passwords: on this device you "claim" one
// of these names during onboarding and that's who you are. No demo kebabs — the
// trip starts empty.

const ROSTER = [
  'Clark', 'Angie', 'Matt', 'Sophia', 'David', 'Kiira', 'Brandon',
  'Melissa', 'Claire', 'Mike', 'Marion', 'Rachel', 'Kathy', 'Dino',
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

export const TRIP_DAYS = 14;
export const FREEZES = 2;

// Your personal day grid — the last entry is "today". Starts with just today, empty.
export const YOU_DAYS = [{ count: 0 }];

export function computeStreak(days) {
  let cur = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0 || days[i].frozen) cur++; else break;
  }
  let longest = 0;
  let run = 0;
  days.forEach(d => {
    if (d.count > 0 || d.frozen) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  });
  const kebabs = days.reduce((s, d) => s + d.count, 0);
  const eaten = days.filter(d => d.count > 0).length;
  return { cur, longest, kebabs, eaten };
}

// Streak for any player, derived purely from the shared feed: consecutive local
// days (through today, or yesterday if they haven't eaten yet today) with >=1
// kebab. Used for everyone except "you" (whose streak comes from the day grid,
// which also tracks freezes / cheat days).
export function streakFromFeed(feed, name) {
  const daysWith = new Set();
  for (const f of feed) {
    if (f.player === name && f.ts) daysWith.add(localDayNum(f.ts));
  }
  if (!daysWith.size) return 0;
  const today = localDayNum(Date.now());
  let start = daysWith.has(today) ? today : (daysWith.has(today - 1) ? today - 1 : null);
  if (start == null) return 0;
  let streak = 0;
  let d = start;
  while (daysWith.has(d)) { streak++; d--; }
  return streak;
}

function localDayNum(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return Math.round(d.getTime() / 86400000);
}
