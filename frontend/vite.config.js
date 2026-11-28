import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import net from 'node:net'

function isPrivateHost(hostname) {
  const h = (hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h === '::1' || h === '::' || h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true;
  if (!net.isIPv4(h)) return false;
  const [a, b] = h.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

function isSafeProxyUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (u.username || u.password || isPrivateHost(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function devCorsProxyPlugin() {
  return {
    name: 'dev-cors-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/proxy')) {
          return next();
        }
        try {
          const parsed = new URL(req.url, 'http://127.0.0.1:5173');
          const targetUrl = parsed.searchParams.get('url');
          if (!targetUrl || !isSafeProxyUrl(targetUrl)) {
            res.statusCode = targetUrl ? 403 : 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: targetUrl ? 'forbidden_proxy_target' : 'missing_url' }));
          }
          const upstream = await fetch(targetUrl, {
            redirect: 'error',
            signal: AbortSignal.timeout(10_000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'text/plain,text/html,*/*',
            },
          });
          const content = await upstream.text();
          res.statusCode = upstream.status;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          const origin = req.headers.origin;
          if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
          }
          return res.end(content);
        } catch (err) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'proxy_failed', detail: err.message }));
        }
      });
    },
  };
}

function pickChunk(id) {
  const p = id.replace(/\\/g, '/');
  if (p.includes('/node_modules/')) {
    if (p.includes('/react/') || p.includes('/react-dom/') || p.includes('/scheduler/')) return 'vendor-react';
    if (p.includes('/three/')) return 'vendor-three';
    if (p.includes('/pdf-lib/') || p.includes('/@pdf-lib/')) return 'vendor-pdf';
    if (p.includes('/immer/') || p.includes('/idb/')) return 'vendor-state';
    return undefined;
  }
  if (p.includes('/data/bestiary') || p.includes('/data/monsters')) return 'srd-bestiary';
  if (p.includes('/data/srd2024-spells')) return 'srd-spells-2024';
  if (p.includes('/data/spells-') || p.includes('/data/srd51-spells')) return 'srd-spells-extra';
  if (p.includes('/data/magic-items-srd') || p.includes('/data/items')) return 'srd-magic-items';
  if (p.includes('/data/expanded-') || p.includes('/data/class-options/') || p.includes('/data/feats')) return 'srd-subclasses';
  if (p.endsWith('/data/srd.js') || p.includes('/data/srd2024-rules') || p.includes('/data/rules2024')) return 'srd';
  if (p.includes('/src/progression/')) return 'progression';
  return undefined;
}

export default defineConfig({
  plugins: [
    react(),
    devCorsProxyPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/data/') || /\.(?:woff2?|png|svg|webp)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'forja-srd-assets', expiration: { maxEntries: 120, maxAgeSeconds: 30 * 24 * 3600 } },
          },
        ],
      },
      manifest: {
        name: 'Forja de Heróis',
        short_name: 'Forja',
        theme_color: '#1a120b',
        background_color: '#0e0a07',
        display: 'standalone',
      },
    }),
  ],
  server: {
    port: 5173,
    host: process.env.VITE_DEV_HOST || '127.0.0.1',
    proxy: { '/api': 'http://127.0.0.1:4000' },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: pickChunk,
      },
    },
  },
})
