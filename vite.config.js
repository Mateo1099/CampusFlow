import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'sounds/**/*'],
      manifest: {
        name: 'CampusFlow',
        short_name: 'CampusFlow',
        theme_color: '#080b11',
        background_color: '#080b11',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/sounds/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'campusflow-sounds',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && !url.pathname.startsWith('/sounds/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'campusflow-network-first',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    // Target modern browsers for better optimization
    target: 'esnext',
    
    // Optimize chunk size
    rollupOptions: {
      output: {
        // Manual chunk strategy for better caching and parallel loading
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-framer-motion';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          
          // Services and utilities
          if (id.includes('/src/lib/')) {
            return 'services-api';
          }
          
          // UI Components
          if (id.includes('/src/components/ui/')) {
            return 'ui-components';
          }
          
          // Layout
          if (id.includes('/src/components/layout/')) {
            return 'layout';
          }
          
          // Context providers
          if (id.includes('/src/context/')) {
            return 'context';
          }
          
          // Hooks
          if (id.includes('/src/hooks/')) {
            return 'hooks';
          }
        },
        
        // Chunk size warnings threshold
        chunkFileNames: 'assets/chunks/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name?.split('.')?.pop()?.toLowerCase() || '';
          if (/png|jpe?g|gif|svg|webp/.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff|woff2|ttf|otf|eot/.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    
    // Vite 8 incluye Oxc: evita el proceso externo de Terser y reduce el
    // tiempo de build tanto en Windows como en GitHub Actions.
    minify: 'oxc',

    // Source maps for production (can be disabled for smaller builds)
    sourcemap: false,

    // El reporte gzip es solo informativo y añade trabajo innecesario al CI.
    reportCompressedSize: false,
    
    // CSS code splitting
    cssCodeSplit: true
  },
  
  // Optimization for dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})
