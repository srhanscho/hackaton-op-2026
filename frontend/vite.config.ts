import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // host: true expone el dev server en la red local.
    // Sin esto los celulares NO pueden abrir el link del QR.
    host: true,
    port: 5173,
    // El wifi de la CUC aisla los dispositivos, asi que servimos por
    // cloudflared. Sin allowedHosts, Vite responde "Blocked request".
    allowedHosts: true,
    // Front y back corren en la MISMA maquina, asi que Vite hace de proxy.
    // Resultado: mismo origen -> sin CORS, sin mixed content, UN solo tunel.
    proxy: {
      '/api': 'http://localhost:3000',
      '/callback': 'http://localhost:3000',
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:3000',
      '/callback': 'http://localhost:3000',
    },
  },
})
