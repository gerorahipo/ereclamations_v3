import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo-cnps.png'],
      manifest: {
        name: 'eRéclamations CNPS',
        short_name: 'eRéclamations',
        description: 'Système de gestion des réclamations CNPS CI',
        theme_color: '#0055A4',
        icons: [
          {
            src: 'logo-cnps.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo-cnps.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'logo-cnps.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:81',
        changeOrigin: true,
      },
    },
  },
})
