// Game state + persistence + sync, all wrapped in one hook.
//
// Why a single hook? The crew score, your streak, the chain and the leaderboard
// are all derived from one source of truth: the feed (array of kebab events).
// Keeping that in one place makes the offline/online merge logic trivial.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { read, write, generateTripCode, uuid } from './storage.js';
import { syncOnce, mergeFeed, sanitizeForSync, nextBackoff } from './sync.js';
import { DEFAULT_CREW, TRIP_DAYS, FREEZES, YOU_DAYS, streakFromFeed } from './data.js';

// Defaults match the design's final state: Game Boy palette, clean LCD (no
// scanlines/CRT — those are arcade/TV effects, not handheld). All four palettes
// stay available in Tweaks.
const TWEAK_DEFAULTS = {
  palette: 'Game Boy',
  tone: 'hype',
  scanlines: false,
  crt: false,
};

function loadInitial() {
  const tripCode = read('tripCode') || generateTripCode();
  const settings = { ...TWEAK_DEFAULTS, ...(read('settings') || {}) };
  const playerName = read('playerName') || '';
  const playerAvatar = read('playerAvatar', 1);
  const feed = read('feed') || [];
  const crew = read('crew') || DEFAULT_CREW.map(c => ({ ...c }));
  const days = read('days') || YOU_DAYS.map(d => ({ ...d }));
  const freezes = read('freezes', FREEZES);
  const tripDays = read('tripDays', TRIP_DAYS);
  const lastSyncTs = read('lastSyncTs', 0);
  const phase = (() => {
    const booted = read('booted', false);
    const onboarded = read('onboarded', false);
    return booted ? (onboarded ? 'play' : 'onboard') : 'boot';
  })();
  const eatConfirmed = read('eatConfirmed', false);
  return { tripCode, settings, playerName, playerAvatar, feed, crew, days, freezes, tripDays, lastSyncTs, phase, eatConfirmed };
}

export function useGameStore() {
  const initial = useRef(loadInitial()).current;

  const [tripCode, setTripCode] = useState(initial.tripCode);
  const [settings, setSettingsRaw] = useState(initial.settings);
  const [playerName, setPlayerName] = useState(initial.playerName);
  const [playerAvatar, setPlayerAvatar] = useState(initial.playerAvatar);
  const [feed, setFeed] = useState(initial.feed);
  const [crew, setCrew] = useState(initial.crew);
  const [days, setDays] = useState(initial.days);
  const [freezes, setFreezes] = useState(initial.freezes);
  const [tripDays, setTripDays] = useState(initial.tripDays);
  const [lastSyncTs, setLastSyncTs] = useState(initial.lastSyncTs);
  const [phase, setPhase] = useState(initial.phase);
  const [eatConfirmed, setEatConfirmed] = useState(initial.eatConfirmed);
  const [online, setOnline] = useState(navigator.onLine !== false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // ── persistence: every mutation drops to localStorage immediately
  // Block-bodied so the boolean return from write() isn't treated as a cleanup fn.
  useEffect(() => { write('tripCode', tripCode); }, [tripCode]);
  useEffect(() => { write('settings', settings); }, [settings]);
  useEffect(() => { write('playerName', playerName); }, [playerName]);
  useEffect(() => { write('playerAvatar', playerAvatar); }, [playerAvatar]);
  useEffect(() => { write('feed', feed); }, [feed]);
  useEffect(() => { write('crew', crew); }, [crew]);
  useEffect(() => { write('days', days); }, [days]);
  useEffect(() => { write('freezes', freezes); }, [freezes]);
  useEffect(() => { write('tripDays', tripDays); }, [tripDays]);
  useEffect(() => { write('lastSyncTs', lastSyncTs); }, [lastSyncTs]);
  useEffect(() => { write('eatConfirmed', eatConfirmed); }, [eatConfirmed]);

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
        const result = await syncOnce({
          tripCode: tc,
          kebabs: pending,
          lastSyncTs,
          signal: controller.signal,
        });
        clearTimeout(timer);
        // If the trip changed during the request (e.g. a reset), drop stale results.
        if (tripCodeRef.current !== tc) return;
        const incoming = Array.isArray(result?.kebabs) ? result.kebabs : [];
        // Mark our pushed kebabs as no-longer-pending; merge with anything new.
        setFeed(curr => {
          const cleared = curr.map(k => k.pending && pending.find(p => p.id === k.id)
            ? { ...k, pending: false }
            : k);
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

  // ── derived values
  // Tombstoned (deleted) kebabs stay in the raw feed so the deletion can sync,
  // but are hidden from every count, screen and streak.
  const visibleFeed = useMemo(() => feed.filter(k => !k.deleted), [feed]);

  const youStreak = useMemo(() => {
    let cur = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].count > 0 || days[i].frozen) cur++; else break;
    }
    return cur;
  }, [days]);

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
      return {
        ...c,
        you: isYou,
        kebabs: liveKebabs != null ? liveKebabs : (c.kebabs || 0),
        streak: isYou ? youStreak : streakFromFeed(visibleFeed, c.name),
        avatar: isYou ? playerAvatar : (avatarByPlayer.get(c.name) ?? c.avatar ?? 1),
      };
    });
    // Crown the player with the longest active streak.
    const maxStreak = Math.max(0, ...mapped.map(c => c.streak));
    const kingName = maxStreak > 0 ? (mapped.find(c => c.streak === maxStreak) || {}).name : null;
    return mapped.map(c => ({ ...c, king: c.name === kingName }));
  }, [crew, visibleFeed, playerName, playerAvatar, youStreak]);

  const groupScore = crewView.reduce((s, c) => s + c.kebabs, 0);

  const todayCount = useMemo(() => {
    const startOfDay = startOfLocalDay(Date.now());
    return visibleFeed.filter(f => (f.ts || 0) >= startOfDay).length;
  }, [visibleFeed]);

  const settings_ = settings;
  const you = crewView.find(c => c.name === playerName) || crewView.find(c => c.you) || crewView[0];

  // ── actions
  const logKebab = useCallback((partial) => {
    const now = Date.now();
    const time = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const last = visibleFeed[0];
    const city = partial?.city || last?.city || 'Berlin';
    const cc = partial?.cc || last?.cc || 'DE';
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
      photo: !!partial?.photo,
      when: 'TODAY ' + time,
      ts: now,
      pending: true,
    };
    setFeed(prev => [kebab, ...prev]);
    setDays(prev => {
      const n = prev.map(x => ({ ...x }));
      const t = n.length - 1;
      n[t] = { ...n[t], count: (n[t].count || 0) + 1, missed: false };
      return n;
    });
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
      const next = { ...k };
      for (const key of ['rating', 'shop', 'meat', 'price', 'note', 'photo', 'city', 'cc']) {
        if (details[key] !== undefined) next[key] = details[key];
      }
      if (newPlayer && newPlayer !== k.player) {
        next.player = newPlayer;
        // Stamp the attributed player's avatar so the crew sees the right face.
        const m = crew.find(c => c.name === newPlayer);
        if (m) next.avatar = m.avatar ?? next.avatar;
      }
      return next;
    }));
    if (newPlayer && newPlayer !== playerName) {
      setDays(prev => {
        const n = prev.map(x => ({ ...x }));
        const t = n.length - 1;
        if (n[t] && n[t].count > 0) n[t] = { ...n[t], count: n[t].count - 1 };
        return n;
      });
    }
  }, [crew, playerName]);

  // Edit any logged kebab. `updatedAt` + pending make the change re-sync, and the
  // server upserts by id so the edit reaches the rest of the pod.
  const editKebab = useCallback((id, fields) => {
    const newPlayer = fields && fields.player ? fields.player.toUpperCase() : null;
    setFeed(prev => prev.map(k => {
      if (k.id !== id) return k;
      const next = { ...k, updatedAt: Date.now(), pending: true };
      for (const key of ['rating', 'shop', 'meat', 'price', 'note', 'photo', 'city', 'cc']) {
        if (fields[key] !== undefined) next[key] = fields[key];
      }
      // Only touch the face if the kebab is being re-attributed to a different player.
      if (newPlayer && newPlayer !== k.player) {
        next.player = newPlayer;
        next.avatar = newPlayer === playerName
          ? playerAvatar
          : ((crew.find(c => c.name === newPlayer) || {}).avatar ?? next.avatar);
      }
      return next;
    }));
  }, [crew, playerName, playerAvatar]);

  // Soft-delete (tombstone) so the removal syncs and stays gone across devices.
  const deleteKebab = useCallback((id) => {
    setFeed(prev => prev.map(k => k.id === id
      ? { ...k, deleted: true, updatedAt: Date.now(), pending: true }
      : k));
  }, []);

  const useFreeze = useCallback(() => {
    setDays(prev => {
      const n = prev.map(x => ({ ...x }));
      const t = n.length - 1;
      if (n[t].count === 0) n[t] = { ...n[t], frozen: true, missed: false };
      return n;
    });
    setFreezes(f => Math.max(0, f - 1));
  }, []);

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
    if (avatar != null) setPlayerAvatar(avatar);
    setCrew(prev => {
      const idx = prev.findIndex(c => c.name === clean);
      if (idx === -1) {
        return [...prev, { name: clean, kebabs: 0, streak: 0, color: 'gold', avatar: avatar ?? 1 }];
      }
      if (avatar != null) return prev.map((c, i) => i === idx ? { ...c, avatar } : c);
      return prev;
    });
  }, []);

  // A true wipe. The key move is a fresh trip code: the old code's events stay
  // on the server (untouched), but this device starts on a brand-new, empty
  // partition — so the heartbeat sync can't pull the old chain/scores back.
  const resetGame = useCallback(() => {
    setCrew(DEFAULT_CREW.map(c => ({ ...c })));
    setFeed([]);
    setDays(YOU_DAYS.map(d => ({ ...d })));
    setFreezes(FREEZES);
    setTripDays(TRIP_DAYS);
    setLastSyncTs(0);
    setTripCode(generateTripCode());
  }, []);

  const updateCrew = useCallback((nextCrew) => setCrew(nextCrew), []);

  return {
    // state
    tripCode, settings, playerName, playerAvatar, feed: visibleFeed, crew: crewView, days, freezes, tripDays,
    phase, online, syncing, syncError, eatConfirmed,
    // derived
    groupScore, todayCount, you, youStreak,
    // actions
    setTripCode, setTweak, claimIdentity, updateCrew, setTripDays,
    logKebab, saveKebab, editKebab, deleteKebab, useFreeze, sync, confirmEat,
    markBooted, finishOnboard, showBoot, showOnboard, resetGame,
  };
}

function startOfLocalDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
