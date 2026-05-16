import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em dev, o frontend roda em :5173 e o backend em :4000. Cookies cross-origin
// funcionam graças a credentials:'include' + Django CORS_ALLOW_CREDENTIALS.
// Em produção, definir VITE_API_URL=https://seu-app.pythonanywhere.com
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
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
          // Progressão é compartilhada entre Sheet e Campaign
          'progression': ['./src/progression/engine.js', './src/progression/rules.js'],
        },
      },
    },
  },
})
