# Kebab Quest 🥙

A retro 16-bit arcade tracker for the pod's overseas kebab pilgrimage. Built to be **bulletproof on spotty international wifi**: everything works offline, syncs when it can, and never loses a kebab.

**Live:** <https://kebab.quest>

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
you tap EAT KEBAB, the **WHO ATE IT?** control (collapsed to just you by default)
expands so you can tag the kebab to any pod member — it counts for **them** (their
score, streak, and avatar on the chain/log), bidirectionally, on every device. Your
own streak only counts kebabs logged as yourself.

Avatars ride along on each kebab event, so once someone logs on their own phone the
whole pod sees their chosen face — no extra profile sync needed.

## Pod sync — how to use

There's nothing to set up. The whole pod shares **one fixed trip** (`TRIP_CODE` in
`src/lib/data.js`) — no codes to type. On each phone:

1. Open the app → tap PRESS START → pick your **name + avatar** → HOW TO PLAY → START.

That's it. Every `EAT KEBAB` tap on any phone shows up on everyone's HQ / CHAIN / POD /
LOG within ~25 seconds (or instantly when the logging phone is online). The edge
function upserts each kebab by id with **optimistic concurrency (etag CAS)**, so two
phones logging at the same instant never clobber each other.

**Admin (Clark only).** When the device's identity is `CLARK`, the Tweaks panel grows
a **Clark Zone**: sync status/debug, the pod roster editor, and **Reset all kebabs**
(which wipes the shared server log for the whole pod). Everyone else just sees palette
/ scanlines / CRT / voice, the name picker, and title/how-to-play.

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

### Performance / regenerating assets

Built to be light on spotty overseas wifi — the offline precache is ~**360 KB**
(was ~680 KB). Everything is same-origin: **fonts are self-hosted + subset**
(no Google CDN round-trip), and all raster art is **indexed PNG** (8-bit palette).

```bash
# Raster art → small indexed PNGs (ImageMagick)
magick kebab-src.png  -resize x480 -colors 96  PNG8:public/kebab.png          # hero ~38 KB
magick favicon-src.png            -colors 128 PNG8:public/icons/icon-512.png  # install icon
magick favicon-src.png -resize 192x192 -colors 128 PNG8:public/icons/icon-192.png
magick favicon-src.png -resize 128x128 -colors 64  PNG8:public/favicon.png     # tab favicon ~5 KB
for f in public/avatars/Icon*.png; do magick "$f" -colors 64 PNG8:"$f"; done   # ~0.4 KB each
magick unfurl-src.png -resize 1200x +dither -colors 32 PNG8:public/unfurl.png   # social card (not precached)

# Fonts → self-hosted, subset to used glyphs (fonttools / pyftsubset)
pyftsubset SRC.woff2 --unicodes="U+0020-00FF,U+2013-2014,U+2018-201F,U+2022,U+2026,U+2039-203A,U+20AC,U+25B2,U+25B6,U+25C0,U+2605,U+2715" \
  --flavor=woff2 --layout-features='*' --output-file=public/fonts/NAME.woff2
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
