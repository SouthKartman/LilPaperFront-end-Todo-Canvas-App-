// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import svgr from 'vite-plugin-svgr' // 1. Импортируй

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
  
    // Важно: кэшируем все необходимые файлы
  includeAssets: [
    'favicon.ico',
    'Logo.png',
    'robots.txt',
    '**/*.{js,css,html,ico,png,svg,woff2}'
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
    // Кэшируем ВСЕ glob паттерны
    globPatterns: [
      '**/*.{js,css,html,ico,png,svg,woff2,json}',
      'assets/**/*',
      '*.{js,css}'
    ],
    globIgnores: [
      '**/sw.js',
      '**/workbox-*.js',
      '**/dexie.js'
    ],
    
    swSrc: 'src/service-worker/sw.ts',
    swDest: 'dist/sw.js',  // 👈 В папку dist

      // Важно: максимальный размер файла для кэширования
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB


    // Дополнительные записи в манифест (прекеш)
    additionalManifestEntries: [
      { url: '/', revision: null },
      { url: '/index.html', revision: null },
      { url: '/', revision: null },
    ],
  },

// В dev режиме отключаем некоторые фичи
  devOptions: {
    enabled:false,
    type: 'module',
    navigateFallback: undefined, // Отключаем в dev
  },

  workbox: {
    // Отключаем предупреждения в dev
    ...(process.env.NODE_ENV === 'development' ? {
      navigateFallback: undefined,
      cleanupOutdatedCaches: false,
    } : {
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
    })
  }
})

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
});