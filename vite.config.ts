import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
    manifest: {
      id: '/', name: 'TradingAgents Journal', short_name: 'TA Journal',
      description: 'Jurnal trading pribadi. Catat, pahami, dan berkembang. Tetap bekerja offline.',
      lang: 'id', dir: 'ltr', start_url: '/', scope: '/', display: 'standalone',
      orientation: 'any', background_color: '#f5f7f8', theme_color: '#142c35',
      categories: ['finance', 'productivity'],
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      shortcuts: [
        { name: 'Catat trade', short_name: 'Catat trade', url: '/#/trades?new=1' },
        { name: 'Jurnal harian', short_name: 'Jurnal harian', url: '/#/notes' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      navigateFallback: '/index.html',
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
    },
    devOptions: { enabled: false },
  })],
  server: { host: '0.0.0.0', port: 5173, allowedHosts: ['.e2b.app'], cors: true },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: ['.e2b.app'] },
  build: { sourcemap: false, chunkSizeWarningLimit: 900 },
});
