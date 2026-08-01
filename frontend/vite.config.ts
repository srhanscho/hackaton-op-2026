import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // host: true expone el dev server en la red local.
    // Sin esto los celulares NO pueden abrir el link del QR.
    host: true,
    port: 5173,
  },
})
