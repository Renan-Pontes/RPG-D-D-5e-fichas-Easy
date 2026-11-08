import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Plugin de desenvolvimento para contornar restrições de CORS
 * em importações de monstros de fontes externas (DandWiki, Wikidot, etc.)
 * quando rodando apenas via `npm run dev` sem o backend Django ligado.
 */
function devCorsProxyPlugin() {
  return {
    name: 'dev-cors-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/proxy')) {
          return next();
        }
        try {
          const parsed = new URL(req.url, 'http://localhost:5173');
          const targetUrl = parsed.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'missing_url' }));
          }
          const upstream = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'text/plain,text/html,*/*'
            }
          });
          const content = await upstream.text();
          res.statusCode = upstream.status;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.end(content);
        } catch (err) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'proxy_failed', detail: err.message }));
        }
      });
    }
  };
}

// Em dev, o frontend roda em :5173 e o backend em :4000. Cookies cross-origin
// funcionam graças a credentials:'include' + Django CORS_ALLOW_CREDENTIALS.
// Em produção, definir VITE_API_URL=https://seu-app.pythonanywhere.com
export default defineConfig({
  plugins: [react(), devCorsProxyPlugin()],
  server: {
    port: 5173,
    host: true,
    proxy: { '/api': 'http://127.0.0.1:4000' },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          // React pra cache eterno
          'react-vendor': ['react', 'react-dom'],
          // SRD é grande (~70KB) e raramente muda — chunk próprio
          'srd': ['./data/srd.js'],
          // Bestiário do combate (SRD 5.2.1 gerado, ~500KB) — só muda ao reimportar
          'bestiary': ['./data/bestiary.js', './data/monsters-srd521.js', './data/monsters.js'],
          // Progressão é compartilhada entre Sheet e Campaign
          'progression': ['./src/progression/engine.js', './src/progression/rules.js'],
        },
      },
    },
  },
})
