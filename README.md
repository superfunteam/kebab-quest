# Kebab Quest 🥙

A retro 16-bit arcade tracker for the pod's overseas kebab pilgrimage. Built to be **bulletproof on spotty international wifi**: everything works offline, syncs when it can, and never loses a kebab.

## Run it locally

```bash
npm install
npm run dev        # vite dev server on http://localhost:5173
npm run build      # produces dist/
npm run preview    # serves dist/ for a final sanity check

# Backend (Netlify Edge Function + Blobs) runs under netlify dev:
npx netlify dev    # http://localhost:8888 — proxies the dev server + runs /api/sync
```

`npm run dev` alone runs the frontend with **no backend** — the app still works, all writes stay queued in localStorage, and the sync badge shows `OFFLINE/QUEUED`. To exercise the real sync round-trip, use `netlify dev`.

## Deploy to Netlify

1. Push the repo to GitHub.
2. In Netlify, **Add new site → Import from Git** and pick the repo.
3. Build settings come from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Edge function:** auto-detected from `netlify/edge-functions/sync.js`
4. Netlify Blobs is **enabled by default** — no config needed.
5. First deploy will provision the blob store `kebab-quest`.

## Architecture

```
                     ┌────────────────────────┐
   one phone in      │   Browser (PWA)        │
   the crew          │  ──────────────────    │
                     │  React app             │
                     │  localStorage (truth)  │ ← always works offline
                     │  Service worker (Vite  │
                     │   PWA: cache shell +   │
                     │   Google Fonts)        │
                     └───────┬────────────────┘
                             │  fetch /api/sync
                             ▼  (POST { tripCode, kebabs, lastSyncTs })
                     ┌────────────────────────┐
                     │ Netlify Edge Function  │ ← global PoPs → low-latency
                     │ netlify/edge-functions │   sync from anywhere
                     │  /sync.js              │
                     └───────┬────────────────┘
                             │  getStore('kebab-quest').setJSON/get
                             ▼
                     ┌────────────────────────┐
                     │ Netlify Blobs          │ ← managed key-value store,
                     │  key: trip:<CODE>      │   free tier (1GB / 50k req/mo)
                     │  value: kebab event[]  │   is more than enough
                     └────────────────────────┘
```

## Why this is bulletproof overseas

- **localStorage is the source of truth** — every kebab is persisted before sync is even attempted. Slow/down server = no UX impact.
- **Event log model** — every kebab gets a UUID at the moment of tapping. Sync just merges immutable events by id. No conflicts, no lost data, no last-write-wins anxiety.
- **Service worker caches the entire app shell** — the app opens fully offline; Google Fonts are cached after the first online load too.
- **Smart sync triggers** — on app load, on online event, on visibility change (when you reopen the app), on every new kebab, and every 25s as a heartbeat. All silent — failures stay queued.
- **Edge Function instead of regular Function** — distributed globally, so a phone in Hvar talks to a nearby PoP instead of US-East.
- **Trip code partitioning** — friends type the same code (or scan a QR) into Tweaks → Trip code, and instantly join the same group leaderboard.

## The pod & identities

The roster is a **fixed list of the friend group** — "the pod" (edit it in
`src/lib/data.js` → `ROSTER`). Everyone gets a leaderboard slot whether they're
actively logging or not, so you can always see the whole pod.

**No passwords.** On first launch each person taps **PRESS START → WHO ARE YOU?**,
picks their name and a pixel avatar, and that's stored on the device
(`kq:playerName` / `kq:playerAvatar`). To switch who a device belongs to later:
Tweaks (gear) → **Playing as**.

**Log on behalf of anyone.** Eating with friends who aren't on their phones? After
you tap EAT KEBAB, the detail sheet has a **WHO ATE IT?** picker — tag the kebab to
any pod member and it counts for them (their score, their avatar on the chain/log).
Your own personal streak only counts kebabs you logged as yourself.

Avatars ride along on each kebab event, so once someone logs on their own phone the
whole pod sees their chosen face — no extra profile sync needed.

## Pod sync — how to use

On each phone:

1. Open the app → tap PRESS START → pick your **name + avatar** → HOW TO PLAY → START.
2. Tap the **gear icon** (top-left) → **Tweaks panel**.
3. **Trip code** → one of you types a fresh code (e.g. `BALKAN26`); everyone else types the *same* code. That's the shared backend partition.
4. (Optional) edit the **Pod roster** if someone's missing or you want different colors.

From then on, every `EAT KEBAB` tap on any phone shows up on everyone's HQ / CHAIN / POD / LOG within ~25 seconds (or instantly when the syncing phone is online).

## Project layout

```
src/
  App.jsx                 # phase machine + tap/popup/burst orchestration
  main.jsx                # entry; mounts <App/>
  index.css               # global styles + retro keyframes (bob, pixBurst, popFloat, …)
  lib/
    theme.js              # PALETTES, makeTheme, VOICE, POW_WORDS
    sprites.jsx           # PixelSprite, KebabSprite, MonoIcon, PixelStars, Avatar
    data.js               # ROSTER (14 players), avatars, streakFromFeed
    storage.js            # safe localStorage wrapper + uuid()
    sync.js               # syncOnce() + mergeFeed()
    useGameStore.js       # the one game-state hook (state + persistence + sync + identity)
  components/
    BootScreen.jsx        # PRESS START
    Onboarding.jsx        # WHO ARE YOU? (name + avatar) → HOW TO PLAY
    LogSheet.jsx          # post-tap sheet — rating, meat/veg, WHO ATE IT? picker
    BottomNav.jsx         # HQ · CHAIN · STREAK · POD · LOG
    TweaksPanel.jsx       # settings drawer (palette, voice, pod, trip code)
    SyncBadge.jsx         # top-right indicator
    Panel.jsx             # chunky 16-bit panel
  screens/
    HQScreen.jsx          # the giant tap button
    ChainScreen.jsx       # scrollable zigzag activity log
    StreakScreen.jsx      # your trip calendar + freeze mechanic
    CrewScreen.jsx        # the pod leaderboard
    LogScreen.jsx         # pod kebab feed
netlify/
  edge-functions/sync.js  # /api/sync — POST { tripCode, kebabs, lastSyncTs }
public/
  manifest.webmanifest    # generated by vite-plugin-pwa from vite.config.js
  favicon.png             # app icon / favicon (square pixel-art kebab)
  icons/icon-192.png      # PWA icon (derived from favicon.png)
  icons/icon-512.png      # PWA icon + maskable (derived from favicon.png)
  avatars/Icon1..48.png   # 48 pixel-art player faces (precached for offline)
  kebab.png               # the hero kebab (boot screen + EAT button; transparent)
  unfurl.png              # social-share card (og:image, 1200×675; not precached)
```

### Regenerating the icons / images

Icons and the social card are derived from the source art with ImageMagick:

```bash
# PWA icons + favicon from the square icon art
magick favicon-src.png -resize 512x512 -colors 256 PNG8:public/icons/icon-512.png
magick favicon-src.png -resize 192x192 -colors 256 PNG8:public/icons/icon-192.png
magick favicon-src.png -resize 512x512 -colors 256 PNG8:public/favicon.png
# Social unfurl card (keep it small: 1200w, 32-colour indexed PNG)
magick unfurl-src.png  -resize 1200x +dither -colors 32 PNG8:public/unfurl.png
```

## Customizing for *your* trip

Everything that varies between trips is configurable inside the app via **Tweaks** (the gear icon):

- **Palette** — Arcade · Game Boy · Super 16 · Commodore
- **Scanlines / CRT vignette** — toggle the full retro treatment
- **Voice tone** — `hype` (LET'S GO, KEBAB KING) or `dry` (No kebab logged today.)
- **Trip length** — 1–60 days; controls the streak calendar grid
- **Pod roster** — add/remove players, set their colour and avatar
- **Trip code** — group identifier for backend sync

Or hand-edit the seed defaults in [`src/lib/data.js`](src/lib/data.js).
