import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // We call registerSW() ourselves in main.jsx (virtual:pwa-register) to add
      // focus/interval update checks, so don't also auto-inject a registration.
      injectRegister: null,
      includeAssets: ['favicon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        id: '/',
        name: 'Kebab Quest',
        short_name: 'Kebab Quest',
        description: 'One pod, many kebabs. A retro 16-bit kebab tracker for the trip.',
        lang: 'en',
        dir: 'ltr',
        categories: ['games', 'lifestyle', 'social'],
        theme_color: '#0f380f',
        background_color: '#05040d',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        screenshots: [
          { src: '/unfurl.png', sizes: '1200x675', type: 'image/png', form_factor: 'wide', label: 'Kebab Quest' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Drop precaches from prior deploys so an updated install doesn't keep
        // serving a stale build alongside the new one.
        cleanupOutdatedCaches: true,
        // Social unfurl image — served on demand to scrapers, not worth precaching.
        globIgnores: ['unfurl.png'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          // Fonts are now self-hosted + precached, so no Google CDN rules needed.
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            method: 'POST'
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 4
            }
          }
        ]
      }
    })
  ],
  server: { port: 5173, host: true }
});
