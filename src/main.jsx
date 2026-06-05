import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';

// Keep installed / home-screen PWAs current. With registerType:'autoUpdate' a new
// service worker activates as soon as it's found and the page reloads into the
// fresh build automatically (skipWaiting + clientsClaim). The default Vite-injected
// registration does neither of those for an already-open app, which is why the
// crew were stuck on a stale cached build between launches. On top of the
// activate-and-reload, we poll for a new deploy on an interval AND whenever the app
// regains focus, so someone who keeps it open still picks up a fix within ~a minute
// instead of having to fully close and reopen.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    const checkForUpdate = () => { registration.update().catch(() => {}); };
    setInterval(checkForUpdate, 60_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
  },
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
