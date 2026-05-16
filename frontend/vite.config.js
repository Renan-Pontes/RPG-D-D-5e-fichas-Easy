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
})
