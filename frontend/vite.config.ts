import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        short_name: 'CryptoAnalyzer',
        name: 'Crypto Analyzer Pro — Terminal Cuantitativo 2.0',
        description: 'Terminal de Trading Cuantitativo, Señales en Vivo y Grid Bots con persistencia en Supabase.',
        theme_color: '#F59E0B',
        background_color: '#08090C',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
            type: 'image/png',
            sizes: '192x192'
          },
          {
            src: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
            type: 'image/png',
            sizes: '512x512',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
})
