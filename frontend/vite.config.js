import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo-cnps.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
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
        target: env.VITE_API_URL || 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
  }
})
