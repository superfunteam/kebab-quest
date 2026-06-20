// Game state + persistence + sync, all wrapped in one hook.
//
// Why a single hook? The crew score, your streak, the chain and the leaderboard
// are all derived from one source of truth: the feed (array of kebab events).
// Keeping that in one place makes the offline/online merge logic trivial.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { read, write, uuid } from './storage.js';
import { syncOnce, mergeFeed, mergeClaims, mergeFrozen, sanitizeForSync, nextBackoff, resetTripServer } from './sync.js';
import { DEFAULT_CREW, TRIP_CODE, TRIP_DAYS, FREEZES, streakFromFeed, buildDaysFromFeed, computeStreak, localDayNum, whenFromTs, isGameOver, GAME_END_TS } from './data.js';
import { isPhotoUrl } from './photos.js';

// Defaults match the design's final state: Game Boy palette, clean LCD (no
// scanlines/CRT — those are arcade/TV effects, not handheld). All four palettes
// stay available in Tweaks.
const TWEAK_DEFAULTS = {
  palette: 'Game Boy',
  tone: 'hype',
  scanlines: false,
  crt: false,
  sound: true,
};

function loadInitial() {
  const settings = { ...TWEAK_DEFAULTS, ...(read('settings') || {}) };
  // One-time roster rename: Rachel → Asia (keeps each device in sync without a reset).
  let playerName = read('playerName') || '';
  if (playerName === 'RACHEL') playerName = 'ASIA';
  const playerAvatar = read('playerAvatar', 1);
  const feed = read('feed') || [];
  let crew = read('crew') || DEFAULT_CREW.map(c => ({ ...c }));
  crew = crew.map(c => (c.name === 'RACHEL' ? { ...c, name: 'ASIA' } : c));
  // Streak freezes are now a synced, per-player map { NAME: [epochDayNum] } so a
  // cheat day protects a streak on every device. Migrate any legacy you-only
  // frozenDays into our own slot on first load after the upgrade.
  let frozen = read('frozen') || null;
  if (!frozen) {
    frozen = {};
    const legacy = read('frozenDays', []);
    if (playerName && Array.isArray(legacy) && legacy.length) frozen[playerName] = [...legacy];
  }
  const lastSyncTs = read('lastSyncTs', 0);
  const phase = (() => {
    const booted = read('booted', false);
    const onboarded = read('onboarded', false);
    return booted ? (onboarded ? 'play' : 'onboard') : 'boot';
  })();
  const eatConfirmed = read('eatConfirmed', false);
  // Cross-device identity claims: { NAME: { name, avatar, ts } }. Seed our own
  // claim from a pre-existing local identity (ts 0 = "always been mine") so
  // upgrading clients immediately publish who they are on the next sync.
  const claims = read('claims') || {};
  let myClaim = read('myClaim', null);
  if (!myClaim && playerName) myClaim = { name: playerName, avatar: playerAvatar, ts: 0 };
  if (myClaim && !claims[myClaim.name]) claims[myClaim.name] = myClaim;
  return { settings, playerName, playerAvatar, feed, crew, frozen, lastSyncTs, phase, eatConfirmed, claims, myClaim };
}

export function useGameStore() {
  const initial = useRef(loadInitial()).current;

  const tripCode = TRIP_CODE; // single shared trip — everyone on the main pod
  const [settings, setSettingsRaw] = useState(initial.settings);
  const [playerName, setPlayerName] = useState(initial.playerName);
  const [playerAvatar, setPlayerAvatar] = useState(initial.playerAvatar);
  const [feed, setFeed] = useState(initial.feed);
  const [crew, setCrew] = useState(initial.crew);
  const [frozen, setFrozen] = useState(initial.frozen); // { NAME: [epochDayNum] }, synced
  const tripDays = TRIP_DAYS; // fixed trip length (Jun 4–21)
  const [lastSyncTs, setLastSyncTs] = useState(initial.lastSyncTs);
  const [phase, setPhase] = useState(initial.phase);
  const [eatConfirmed, setEatConfirmed] = useState(initial.eatConfirmed);
  const [claims, setClaims] = useState(initial.claims);
  const [myClaim, setMyClaim] = useState(initial.myClaim);
  const [online, setOnline] = useState(navigator.onLine !== false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  // The trip's clock. Flips to true at GAME_END_TS; if the app is open across the
  // deadline, a one-shot timer flips it live so the winner screen appears without
  // a reload.
  const [gameOver, setGameOver] = useState(isGameOver());
  useEffect(() => {
    if (gameOver) return;
    // setTimeout maxes out at a ~24.8-day delay, so for any far-off deadline we
    // re-arm rather than fire early — the flag only flips once the clock has
    // genuinely passed GAME_END_TS.
    let t;
    const arm = () => {
      const ms = GAME_END_TS - Date.now();
      if (ms <= 0) { setGameOver(true); return; }
      t = setTimeout(arm, Math.min(ms, 2 ** 31 - 1));
    };
    arm();
    return () => clearTimeout(t);
  }, [gameOver]);

  // ── persistence: every mutation drops to localStorage immediately
  // Block-bodied so the boolean return from write() isn't treated as a cleanup fn.
  useEffect(() => { write('settings', settings); }, [settings]);
  useEffect(() => { write('playerName', playerName); }, [playerName]);
  useEffect(() => { write('playerAvatar', playerAvatar); }, [playerAvatar]);
  useEffect(() => { write('feed', feed); }, [feed]);
  useEffect(() => { write('crew', crew); }, [crew]);
  useEffect(() => { write('frozen', frozen); }, [frozen]);
  useEffect(() => { write('lastSyncTs', lastSyncTs); }, [lastSyncTs]);
  useEffect(() => { write('eatConfirmed', eatConfirmed); }, [eatConfirmed]);
  useEffect(() => { write('claims', claims); }, [claims]);
  useEffect(() => { write('myClaim', myClaim); }, [myClaim]);

  // ── connection monitoring
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── sync engine
  const backoffRef = useRef(1000);
  const syncTimerRef = useRef(null);
  const inFlightRef = useRef(null);
  // Always-current trip code, so an in-flight sync can detect a reset mid-request.
  const tripCodeRef = useRef(tripCode);
  useEffect(() => { tripCodeRef.current = tripCode; }, [tripCode]);
  // A name we're releasing (a "reset my character"): rides along on every sync
  // until the server confirms it's gone, so the freed name/avatar propagate.
  const releaseRef = useRef(null);
  // Latest identity claim, so every heartbeat re-publishes who this device is.
  const myClaimRef = useRef(myClaim);
  useEffect(() => { myClaimRef.current = myClaim; }, [myClaim]);
  // Our own cheat days, re-published each sync so the pod keeps them in step.
  const myFreezeRef = useRef({ player: playerName, days: frozen[playerName] || [] });
  useEffect(() => { myFreezeRef.current = { player: playerName, days: frozen[playerName] || [] }; }, [frozen, playerName]);

  const sync = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;
    if (!navigator.onLine) { setSyncError('offline'); return; }
    setSyncing(true);
    setSyncError(null);
    const tc = tripCode;
    const pending = feed.filter(k => k.pending).map(sanitizeForSync);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const p = (async () => {
      try {
        const releasing = releaseRef.current;
        const result = await syncOnce({
          tripCode: tc,
          kebabs: pending,
          lastSyncTs,
          claim: myClaimRef.current,
          frozen: myFreezeRef.current,
          release: releasing,
          signal: controller.signal,
        });
        clearTimeout(timer);
        // If the trip changed during the request (e.g. a reset), drop stale results.
        if (tripCodeRef.current !== tc) return;
        // Server processed the release → stop re-sending it.
        if (releasing && releaseRef.current === releasing) releaseRef.current = null;
        // Fold in the pod's streak freezes (cheat days for everyone).
        if (result?.frozen && typeof result.frozen === 'object') {
          setFrozen(curr => mergeFrozen(curr, result.frozen));
        }
        // Fold in the pod's identity claims (names + exclusive avatars). While a
        // release is pending, keep that name stripped so a concurrent pull can't
        // resurrect the identity we're actively clearing.
        if (result?.claims && typeof result.claims === 'object') {
          setClaims(curr => {
            const merged = mergeClaims(curr, result.claims);
            const rel = releasing || releaseRef.current;
            if (rel) delete merged[rel];
            return merged;
          });
        }
        const incoming = Array.isArray(result?.kebabs) ? result.kebabs : [];
        // Mark our pushed kebabs as no-longer-pending; merge with anything new.
        // Only clear the flag for the EXACT version we pushed — if the user edited
        // the kebab again while this request was in flight (newer updatedAt), keep it
        // pending so the newer details re-sync instead of being silently dropped.
        const ver = (k) => (k && (k.updatedAt || k.ts)) || 0;
        setFeed(curr => {
          const cleared = curr.map(k => {
            if (!k.pending) return k;
            const pushed = pending.find(p => p.id === k.id);
            return pushed && ver(pushed) === ver(k) ? { ...k, pending: false } : k;
          });
          return mergeFeed(cleared, incoming);
        });
        if (result?.ts) setLastSyncTs(result.ts);
        backoffRef.current = 1000;
      } catch (e) {
        if (e.name === 'AbortError') setSyncError('timeout');
        else setSyncError(e.message || 'sync failed');
        backoffRef.current = nextBackoff(backoffRef.current);
      } finally {
        clearTimeout(timer);
        setSyncing(false);
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = p;
    return p;
  }, [feed, tripCode, lastSyncTs]);

  // Sync on app load, whenever we come back online, after each tap (via the
  // feed change), and on a slow heartbeat in case the server got new kebabs
  // from another crew member.
  useEffect(() => {
    if (!online) return;
    // Kick off a sync now.
    sync();
    // Heartbeat — every 25 seconds when online and idle, try to pull any new kebabs.
    syncTimerRef.current = setInterval(() => {
      if (navigator.onLine) sync();
    }, 25_000);
    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, tripCode]);

  // Whenever a kebab is queued, fire a sync attempt (silent failure → retry next heartbeat).
  useEffect(() => {
    const pendingCount = feed.filter(k => k.pending).length;
    if (pendingCount > 0 && online) {
      const t = setTimeout(() => sync(), 600);
      return () => clearTimeout(t);
    }
  }, [feed, online, sync]);

  // Publish an identity claim promptly (don't wait for the heartbeat) so the
  // rest of the pod sees the name + avatar as taken within a second of claiming.
  useEffect(() => {
    if (myClaim && online) {
      const t = setTimeout(() => sync(), 400);
      return () => clearTimeout(t);
    }
  }, [myClaim, online, sync]);

  // Push a freeze promptly too, so a cheat day reaches the pod right away.
  useEffect(() => {
    if (online && (frozen[playerName] || []).length) {
      const t = setTimeout(() => sync(), 400);
      return () => clearTimeout(t);
    }
  }, [frozen, playerName, online, sync]);

  // ── derived values
  // Tombstoned (deleted) kebabs stay in the raw feed so the deletion can sync,
  // but are hidden from every count, screen and streak.
  const visibleFeed = useMemo(() => feed.filter(k => !k.deleted), [feed]);

  // Your own cheat days + how many freezes you have left (both now synced, so
  // they read the same on every device).
  const myFrozen = useMemo(() => frozen[playerName] || [], [frozen, playerName]);
  const freezes = Math.max(0, FREEZES - myFrozen.length);

  // Your personal calendar + streak come from the feed now, so a kebab a friend
  // logs for you counts on YOUR streak too (and one you log for them counts on theirs).
  const days = useMemo(
    () => buildDaysFromFeed(visibleFeed, playerName, myFrozen, tripDays),
    [visibleFeed, playerName, myFrozen, tripDays]
  );
  const youStreak = useMemo(() => computeStreak(days).cur, [days]);

  const crewView = useMemo(() => {
    // Recompute each player's kebab count, streak and avatar from the live feed.
    const byPlayer = new Map();
    const avatarByPlayer = new Map(); // latest avatar seen per player (feed is newest-first)
    for (const k of visibleFeed) {
      const p = (k.player || '').toUpperCase();
      byPlayer.set(p, (byPlayer.get(p) || 0) + 1);
      if (k.avatar != null && !avatarByPlayer.has(p)) avatarByPlayer.set(p, k.avatar);
    }
    const mapped = crew.map(c => {
      const liveKebabs = byPlayer.get(c.name);
      const isYou = (c.name === playerName);
      const claim = claims[c.name];
      return {
        ...c,
        you: isYou,
        claimed: !!claim,
        kebabs: liveKebabs != null ? liveKebabs : (c.kebabs || 0),
        // Everyone's streak now folds in their synced freezes, so the leaderboard
        // and Streak King read the same on every device.
        streak: isYou ? youStreak : streakFromFeed(visibleFeed, c.name, frozen[c.name] || []),
        // A face only appears once a player has actually picked one (a synced
        // claim avatar) or has logged a kebab. Unclaimed roster slots stay
        // faceless (null → "?" placeholder) instead of showing a default.
        avatar: isYou ? playerAvatar : (claim?.avatar ?? avatarByPlayer.get(c.name) ?? null),
      };
    });
    // Crown the player with the longest active streak.
    const maxStreak = Math.max(0, ...mapped.map(c => c.streak));
    const kingName = maxStreak > 0 ? (mapped.find(c => c.streak === maxStreak) || {}).name : null;
    return mapped.map(c => ({ ...c, king: c.name === kingName }));
  }, [crew, visibleFeed, playerName, playerAvatar, youStreak, claims, frozen]);

  const groupScore = crewView.reduce((s, c) => s + c.kebabs, 0);

  const todayCount = useMemo(() => {
    const startOfDay = startOfLocalDay(Date.now());
    return visibleFeed.filter(f => (f.ts || 0) >= startOfDay).length;
  }, [visibleFeed]);

  const settings_ = settings;
  const you = crewView.find(c => c.name === playerName) || crewView.find(c => c.you) || crewView[0];

  // ── actions
  const logKebab = useCallback((partial) => {
    // The board is frozen once the trip is over — no new kebabs go on the chain.
    if (isGameOver()) return null;
    const now = Date.now();
    // Inherit the last logged city (you're probably still there), but never invent
    // a placeholder — no location until someone actually enters one.
    const last = visibleFeed.find(k => k.city);
    const city = partial?.city || last?.city || '';
    const cc = partial?.cc || last?.cc || '';
    const kebab = {
      id: uuid(),
      player: playerName,
      avatar: playerAvatar,
      city, cc,
      rating: partial?.rating || 0,
      meat: partial?.meat || 'Chicken',
      price: partial?.price || 0,
      note: partial?.note || '',
      shop: partial?.shop || '',
      photo: isPhotoUrl(partial?.photo) ? partial.photo : '',
      when: whenFromTs(now),
      ts: now,
      pending: true,
    };
    setFeed(prev => [kebab, ...prev]);
    return kebab;
  }, [visibleFeed, playerName, playerAvatar]);

  // Apply log-sheet details and (optionally) re-attribute the kebab to another
  // player ("logged it for Matt"). If it moves away from you, reverse the
  // day-grid bump made on tap so it doesn't count toward your personal streak.
  const saveKebab = useCallback((id, details) => {
    if (!details) return;
    const newPlayer = details.player ? details.player.toUpperCase() : null;
    setFeed(prev => prev.map(k => {
      if (k.id !== id) return k;
      // Bump version + re-queue exactly like editKebab. The tap already pushed a
      // blank kebab (it scored immediately), so without a fresh updatedAt + pending
      // these details would (a) never re-sync to the crew and (b) lose the merge to
      // the blank server copy on the next heartbeat — wiping everything the user typed.
      const next = { ...k, updatedAt: Date.now(), pending: true };
      for (const key of ['rating', 'shop', 'meat', 'price', 'note', 'photo', 'city', 'cc', 'ts']) {
        if (details[key] !== undefined) next[key] = details[key];
      }
      // A changed date re-derives the human "when" label (and re-buckets the
      // kebab in the streak/day grid, which both read from ts).
      if (details.ts !== undefined) next.when = whenFromTs(next.ts);
      if (newPlayer && newPlayer !== k.player) {
        next.player = newPlayer;
        // Stamp the attributed player's OWN picked face — or leave it faceless
        // if they haven't picked yet (rather than inventing a default).
        next.avatar = newPlayer === playerName ? playerAvatar : (claims[newPlayer]?.avatar ?? null);
      }
      return next;
    }));
  }, [claims, playerName, playerAvatar]);

  // Edit any logged kebab. `updatedAt` + pending make the change re-sync, and the
  // server upserts by id so the edit reaches the rest of the pod.
  const editKebab = useCallback((id, fields) => {
    const newPlayer = fields && fields.player ? fields.player.toUpperCase() : null;
    setFeed(prev => prev.map(k => {
      if (k.id !== id) return k;
      const next = { ...k, updatedAt: Date.now(), pending: true };
      for (const key of ['rating', 'shop', 'meat', 'price', 'note', 'photo', 'city', 'cc', 'ts']) {
        if (fields[key] !== undefined) next[key] = fields[key];
      }
      // A changed date re-derives the human "when" label (and re-buckets the
      // kebab in the streak/day grid, which both read from ts).
      if (fields.ts !== undefined) next.when = whenFromTs(next.ts);
      // Only touch the face if the kebab is being re-attributed to a different player.
      if (newPlayer && newPlayer !== k.player) {
        next.player = newPlayer;
        next.avatar = newPlayer === playerName
          ? playerAvatar
          : (claims[newPlayer]?.avatar ?? null);
      }
      return next;
    }));
  }, [claims, playerName, playerAvatar]);

  // Soft-delete (tombstone) so the removal syncs and stays gone across devices.
  const deleteKebab = useCallback((id) => {
    setFeed(prev => prev.map(k => k.id === id
      ? { ...k, deleted: true, updatedAt: Date.now(), pending: true }
      : k));
  }, []);

  // Burn a freeze on today for the current player. Adds the day to our synced
  // map (remaining count is derived, FREEZES − days used). No-op if we're out or
  // today's already frozen.
  const useFreeze = useCallback(() => {
    if (!playerName) return;
    const today = localDayNum(Date.now());
    setFrozen(prev => {
      const mine = prev[playerName] || [];
      if (mine.includes(today) || mine.length >= FREEZES) return prev;
      return { ...prev, [playerName]: [...mine, today] };
    });
  }, [playerName]);

  const setTweak = useCallback((key, value) => {
    setSettingsRaw(s => ({ ...s, [key]: value }));
  }, []);

  const markBooted = useCallback(() => {
    write('booted', true);
    setPhase(p => (p === 'boot' ? (read('onboarded', false) ? 'play' : 'onboard') : p));
  }, []);
  const finishOnboard = useCallback(() => {
    write('onboarded', true);
    setPhase('play');
  }, []);
  const showBoot = useCallback(() => setPhase('boot'), []);
  const showOnboard = useCallback(() => setPhase('onboard'), []);
  const confirmEat = useCallback(() => setEatConfirmed(true), []);

  // Claim an identity on this device — no password, just pick a name (+ avatar).
  const claimIdentity = useCallback((name, avatar) => {
    const clean = (name || '').toUpperCase().trim();
    if (!clean) return;
    setPlayerName(clean);
    const av = avatar != null ? avatar : playerAvatar;
    if (avatar != null) setPlayerAvatar(avatar);
    // Publish the claim locally + queue it for the next sync so the rest of the
    // pod sees this name as taken and this avatar as spoken-for.
    const claim = { name: clean, avatar: av ?? null, ts: Date.now() };
    setMyClaim(claim);
    setClaims(prev => ({ ...prev, [clean]: claim }));
    setCrew(prev => {
      const idx = prev.findIndex(c => c.name === clean);
      if (idx === -1) {
        return [...prev, { name: clean, kebabs: 0, streak: 0, color: 'gold', avatar: av ?? 1 }];
      }
      if (avatar != null) return prev.map((c, i) => i === idx ? { ...c, avatar } : c);
      return prev;
    });
  }, [playerAvatar]);

  // A true wipe. The key move is a fresh trip code: the old code's events stay
  // on the server (untouched), but this device starts on a brand-new, empty
  // partition — so the heartbeat sync can't pull the old chain/scores back.
  // Clark-only. Wipes the whole pod: clears the shared server log, then local.
  const resetGame = useCallback(() => {
    resetTripServer(tripCode).catch(() => {});
    setCrew(DEFAULT_CREW.map(c => ({ ...c })));
    setFeed([]);
    setFrozen({});
    setLastSyncTs(0);
  }, [tripCode]);

  // "Reset my character" — forget who this device is and start over at the title
  // screen. Releases our name + avatar on the server (so the slot frees up for
  // everyone) and re-publishes nothing, so we land back in onboarding clean.
  // Logged kebabs are attributed by name and are untouched.
  const resetMe = useCallback(() => {
    const me = playerName;
    if (me) {
      releaseRef.current = me; // ride-along release on the next sync(s)
      setClaims(prev => {
        if (!prev[me]) return prev;
        const next = { ...prev };
        delete next[me];
        return next;
      });
    }
    setMyClaim(null);
    setPlayerName('');
    setPlayerAvatar(1);
    setEatConfirmed(false);
    write('onboarded', false);
    write('booted', false);
    setPhase('boot');
    // Push the release promptly so the freed name/avatar reach the pod.
    setTimeout(() => { if (navigator.onLine) sync(); }, 50);
  }, [playerName, sync]);

  const updateCrew = useCallback((nextCrew) => setCrew(nextCrew), []);

  return {
    // state
    tripCode, settings, playerName, playerAvatar, feed: visibleFeed, crew: crewView, days, freezes, tripDays,
    phase, online, syncing, syncError, eatConfirmed, claims, gameOver,
    // derived
    groupScore, todayCount, you, youStreak,
    // actions
    setTweak, claimIdentity, updateCrew,
    logKebab, saveKebab, editKebab, deleteKebab, useFreeze, sync, confirmEat,
    markBooted, finishOnboard, showBoot, showOnboard, resetGame, resetMe,
  };
}

function startOfLocalDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
