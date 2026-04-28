import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
    
    // Minification and optimization
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        pure_funcs: ['console.debug', 'console.info']
      }
    },
    
    // Source maps for production (can be disabled for smaller builds)
    sourcemap: false,
    
    // Report compressed sizes
    reportCompressedSize: true,
    
    // CSS code splitting
    cssCodeSplit: true
  },
  
  // Optimization for dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})
