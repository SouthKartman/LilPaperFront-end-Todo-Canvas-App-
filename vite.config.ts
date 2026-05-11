// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [
    react(),
    svgr(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/service-worker',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      
      includeAssets: [
        'favicon.ico',
        'Logo.png',
        'robots.txt',
      ],
      
      manifest: {
        name: 'Lil Papper',
        short_name: 'LilPapper',
        description: 'Интерактивное управление задачами на бесконечном холсте',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/Logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/Logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      
      injectManifest: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff2,json}',
          'assets/**/*',
        ],
        globIgnores: [
          '**/sw.js',
          '**/workbox-*.js',
          '**/dexie.js',
        ],
        
        swSrc: 'src/service-worker/sw.ts',
        swDest: 'dist/sw.js',
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        
        additionalManifestEntries: [
          { url: '/', revision: null },  // Только одна запись для корня
        ],
      },
      
      devOptions: {
        enabled: true,  // Отключаем PWA в dev режиме
      },
    }),
  ],
  
  
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@processes': path.resolve(__dirname, 'src/processes'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@entities': path.resolve(__dirname, 'src/entities'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@widgets': path.resolve(__dirname, 'src/widgets'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },
  
  server: {
    port: 3000,
    open: true,
  },
  
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-redux'],
          'konva-vendor': ['react-konva', 'konva'],
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable'],
        },
      },
    },
  },
  
  optimizeDeps: {
    include: ['konva', 'react-konva'],  // ✅ Добавлено для Vercel
  },
});
