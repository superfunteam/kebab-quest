import React, { useEffect, useMemo, useRef, useState } from 'react';

import { makeTheme, VOICE, POW_WORDS } from './lib/theme.js';
import { useGameStore } from './lib/useGameStore.js';

import { BootScreen } from './components/BootScreen.jsx';
import { Onboarding } from './components/Onboarding.jsx';
import { LogSheet } from './components/LogSheet.jsx';
import { ConfirmEatModal } from './components/ConfirmEatModal.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { TweaksPanel } from './components/TweaksPanel.jsx';
import { SyncBadge } from './components/SyncBadge.jsx';
import { MonoIcon } from './lib/sprites.jsx';

import { HQScreen } from './screens/HQScreen.jsx';
import { ChainScreen } from './screens/ChainScreen.jsx';
import { StreakScreen } from './screens/StreakScreen.jsx';
import { CrewScreen } from './screens/CrewScreen.jsx';
import { LogScreen } from './screens/LogScreen.jsx';

export default function App() {
  const store = useGameStore();
  const T = makeTheme(store.settings.palette);
  const V = VOICE[store.settings.tone] || VOICE.hype;

  const [tab, setTab] = useState('hq');
  const [popups, setPopups] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [justScored, setJustScored] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingKebab, setEditingKebab] = useState(null);
  const pendingKebabRef = useRef(null);
  const comboRef = useRef({ n: 0, t: 0 });

  const currentCity = store.feed[0]?.city || 'Berlin';
  const currentCC = store.feed[0]?.cc || 'DE';
  const pendingCount = useMemo(() => store.feed.filter(k => k.pending).length, [store.feed]);

  // First tap ever → make them confirm they really ate a kebab. After that, log directly.
  const handleTap = () => {
    if (!store.eatConfirmed) {
      setConfirmOpen(true);
      return;
    }
    doTap();
  };

  const handleConfirmEat = () => {
    store.confirmEat();
    setConfirmOpen(false);
    doTap();
  };

  const doTap = () => {
    const now = Date.now();
    const c = comboRef.current;
    c.n = (now - c.t < 3500) ? c.n + 1 : 1;
    c.t = now;
    const word = c.n >= 2 ? 'COMBO x' + c.n : POW_WORDS[Math.floor(Math.random() * POW_WORDS.length)];

    const kebab = store.logKebab();
    pendingKebabRef.current = kebab.id;
    setJustScored(now);
    setTimeout(() => setJustScored(0), 420);

    const pid = now;
    setPopups(p => [...p, { id: pid, word, sub: '+1' }]);
    setTimeout(() => setPopups(p => p.filter(x => x.id !== pid)), 1100);

    const bs = Array.from({ length: 7 }, (_, i) => ({
      id: pid + '_' + i,
      bx: Math.cos(i / 7 * 6.28) * (40 + Math.random() * 30) + 'px',
      by: Math.sin(i / 7 * 6.28) * (40 + Math.random() * 30) + 'px',
      color: [T.gold, T.red, T.green, T.blue][i % 4],
    }));
    setBursts(b => [...b, ...bs]);
    setTimeout(() => setBursts(b => b.filter(x => !bs.find(y => y.id === x.id))), 700);

    setTimeout(() => setSheetOpen(true), 360);
  };

  // The sheet serves both the post-tap log flow and tap-a-row editing.
  const handleSheetSave = (details) => {
    if (editingKebab) {
      if (details) store.editKebab(editingKebab.id, details);
      setEditingKebab(null);
      return;
    }
    const id = pendingKebabRef.current;
    if (details && id) store.saveKebab(id, details);
    pendingKebabRef.current = null;
    setSheetOpen(false);
  };

  const handleSheetClose = () => {
    if (editingKebab) { setEditingKebab(null); return; }
    pendingKebabRef.current = null;
    setSheetOpen(false);
  };

  const handleDelete = () => {
    if (editingKebab && confirm('Delete this kebab for good?')) {
      store.deleteKebab(editingKebab.id);
      setEditingKebab(null);
    }
  };

  // ── visibility-driven sync. When the app comes back to foreground (e.g. user
  // pulls phone out of pocket on a train), kick a sync so they immediately see
  // any new kebabs the rest of the crew has logged.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) store.sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [store]);

  const screenClass = (store.settings.scanlines ? 'scanlines ' : '') + (store.settings.crt ? 'crt' : '');

  return (
    <div className="app-frame">
      <div
        className={screenClass}
        style={{
          position: 'absolute',
          inset: 0,
          background: T.bg1,
          paddingTop: 'calc(var(--safe-top))',
          color: T.text,
        }}
      >
        {/* Gear button — open the tweaks drawer. Hidden during boot/onboarding. */}
        {store.phase === 'play' && !tweaksOpen && (
          <button
            onClick={() => setTweaksOpen(true)}
            title="Settings"
            style={{
              position: 'absolute',
              top: 'calc(8px + var(--safe-top))',
              left: 12,
              zIndex: 130,
              background: 'rgba(0,0,0,0.5)',
              border: '2px solid ' + T.muted,
              padding: '5px 7px',
              cursor: 'pointer',
              boxShadow: `0 3px 0 ${T.bg0}`,
            }}
          >
            <MonoIcon name="gear" size={12} color={T.muted} />
          </button>
        )}

        {store.phase === 'play' && (
          <SyncBadge
            theme={T}
            online={store.online}
            syncing={store.syncing}
            pendingCount={pendingCount}
            onClick={() => store.sync()}
          />
        )}

        {store.phase === 'boot' && <BootScreen theme={T} onStart={store.markBooted} />}
        {store.phase === 'onboard' && (
          <Onboarding
            theme={T}
            crew={store.crew}
            playerName={store.playerName}
            playerAvatar={store.playerAvatar}
            onClaim={store.claimIdentity}
            onDone={store.finishOnboard}
          />
        )}

        {store.phase === 'play' && (
          <div
            key={tab}
            style={{
              position: 'absolute',
              top: 'calc(40px + var(--safe-top))',
              left: 0,
              right: 0,
              bottom: 0,
              paddingBottom: 'calc(74px + var(--safe-bottom))',
              overflow: 'hidden',
              animation: 'fadeIn .2s ease-out',
            }}
          >
            <div style={{ height: '100%', overflowY: 'auto' }}>
              {tab === 'hq' && (
                <HQScreen
                  theme={T}
                  voice={V}
                  crew={store.crew}
                  groupScore={store.groupScore}
                  todayCount={store.todayCount}
                  you={store.you}
                  currentCity={currentCity}
                  currentCC={currentCC}
                  onTap={handleTap}
                  justScored={justScored}
                />
              )}
              {tab === 'chain'  && <ChainScreen  theme={T} voice={V} feed={store.feed} crew={store.crew} onSelect={setEditingKebab} />}
              {tab === 'streak' && <StreakScreen theme={T} voice={V} days={store.days} tripDays={store.tripDays} freezes={store.freezes} onFreeze={store.useFreeze} />}
              {tab === 'crew'   && <CrewScreen   theme={T} crew={store.crew} feed={store.feed} groupScore={store.groupScore} todayCount={store.todayCount} />}
              {tab === 'log'    && <LogScreen    theme={T} feed={store.feed} crew={store.crew} onSelect={setEditingKebab} />}
            </div>
          </div>
        )}

        {/* tap popups + pixel burst */}
        {popups.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: '50%',
              top: '52%',
              zIndex: 110,
              pointerEvents: 'none',
              textAlign: 'center',
              animation: 'popFloat 1.1s steps(8) forwards',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                color: T.gold,
                textShadow: `3px 3px 0 ${T.bg0}`,
              }}
            >
              {p.word}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                color: T.green,
                marginTop: 6,
              }}
            >
              {p.sub} 🥙
            </div>
          </div>
        ))}
        {bursts.map(b => (
          <div
            key={b.id}
            style={{
              position: 'absolute',
              left: '50%',
              top: '52%',
              zIndex: 109,
              pointerEvents: 'none',
              width: 8,
              height: 8,
              background: b.color,
              '--bx': b.bx,
              '--by': b.by,
              animation: 'pixBurst .65s steps(5) forwards',
            }}
          />
        ))}

        <LogSheet
          open={sheetOpen || !!editingKebab}
          theme={T}
          city={editingKebab ? (editingKebab.city || currentCity) : currentCity}
          crew={store.crew}
          youName={store.playerName}
          editKebab={editingKebab}
          onSave={handleSheetSave}
          onClose={handleSheetClose}
          onDelete={handleDelete}
        />

        <ConfirmEatModal
          open={confirmOpen}
          theme={T}
          onConfirm={handleConfirmEat}
          onCancel={() => setConfirmOpen(false)}
        />

        {store.phase === 'play' && <BottomNav tab={tab} setTab={setTab} theme={T} />}
      </div>

      {tweaksOpen && (
        <TweaksPanel
          theme={T}
          settings={store.settings}
          setTweak={store.setTweak}
          playerName={store.playerName}
          playerAvatar={store.playerAvatar}
          onClaimIdentity={store.claimIdentity}
          isAdmin={store.playerName === 'CLARK'}
          crew={store.crew}
          onCrewChange={store.updateCrew}
          online={store.online}
          syncing={store.syncing}
          pendingCount={pendingCount}
          lastSyncTs={store.feed.length ? Math.max(...store.feed.map(k => k.ts || 0)) : 0}
          syncError={store.syncError}
          onSync={store.sync}
          onShowBoot={() => { setTweaksOpen(false); store.showBoot(); }}
          onShowOnboard={() => { setTweaksOpen(false); store.showOnboard(); }}
          onReset={() => { if (confirm("Wipe ALL kebabs for the WHOLE pod — chain, streaks, scores — and clear the shared server. This can't be undone. (Your name & avatar stay.)")) store.resetGame(); }}
          onClose={() => setTweaksOpen(false)}
        />
      )}
    </div>
  );
}
