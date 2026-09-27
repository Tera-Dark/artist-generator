import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { latestArtwork, thumbnail, ProxyError } from './server/danbooruProxy.mjs'

function localImageBridge(): Plugin {
  function attach(server: { middlewares: { use: (path: string, handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void) => void } }) {
    server.middlewares.use('/api/danbooru', (req, res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      void (async () => {
        if (req.method !== 'GET') { res.writeHead(405).end(); return }
        try {
          const url = new URL(req.url || '', 'http://localhost')
          const data = await latestArtwork(url.searchParams.get('artist') || '')
          res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }).end(JSON.stringify(data))
        } catch (error) {
          const status = error instanceof ProxyError ? error.status : 502
          res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ error: 'Artwork unavailable' }))
        }
      })()
    })
    server.middlewares.use('/api/thumbnail', (req, res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      void (async () => {
        if (req.method !== 'GET') { res.writeHead(405).end(); return }
        try {
          const url = new URL(req.url || '', 'http://localhost')
          const image = await thumbnail(url.searchParams.get('url') || '')
          res.writeHead(200, { 'Content-Type': image.type, 'Cache-Control': 'public, max-age=604800' }).end(image.bytes)
        } catch (error) {
          const status = error instanceof ProxyError ? error.status : 502
          res.writeHead(status, { 'Cache-Control': 'no-store' }).end()
        }
      })()
    })
  }
  return {
    name: 'local-danbooru-readonly-bridge',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}

export default defineConfig({
  // Relative assets also work in the GitHub Pages /artist-generator/ subdirectory.
  base: './',
  plugins: [
    vue(),
    localImageBridge(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '画师串生成器',
        short_name: '画师串',
        description: '本地随机画师串、画师库与离线收藏',
        lang: 'zh-CN',
        theme_color: '#fbfcfb',
        background_color: '#fbfcfb',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        globIgnores: ['**/data/artists-full.json'], // 7 MB details load only if the library is opened.
        maximumFileSizeToCacheInBytes: 2_500_000,
        runtimeCaching: [{
          urlPattern: /\/data\/artists-full\.json$/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'artist-generator-details-v1',
            expiration: { maxEntries: 1, maxAgeSeconds: 7 * 24 * 60 * 60 },
          },
        }],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
  preview: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
})
