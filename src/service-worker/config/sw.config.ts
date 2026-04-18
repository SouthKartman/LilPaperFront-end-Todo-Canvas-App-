// src/service-worker/config/sw.config.ts
export const SW_CONFIG = {
  version: '2.0.2', // 🔼 Обновляем версию для сброса кэша
  
  cacheNames: {
    static: `static-v2.0.2`,
    images: `images-v2.0.2`,
    api: `api-v2.0.2`,
    fonts: `fonts-v2.0.2`,
    pages: `pages-v2.0.2`,
    projects: `projects-v2.0.2`,
    bundles: `bundles-v2.0.2`,
  },
  
  // ✅ ИСПРАВЛЕНО: Только гарантированно существующие файлы
  staticAssets: [
    '/',
    '/index.html',
    '/manifest.webmanifest', // ✅ Исправлено: правильное расширение
    // ❌ Убраны файлы, которых может не быть:
    // '/Logo.png',
    // '/favicon.ico',
  ],
  
  // ✅ Файлы для кэширования при первом обращении (не блокируют установку)
  optionalAssets: [
    '/Logo.png',
    '/favicon.ico',
    '/robots.txt',
  ],
  
  patterns: {
    images: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/i,
    fonts: /\.(woff|woff2|ttf|eot)$/i,
    js: /\.js(\?.*)?$/i,
    css: /\.css(\?.*)?$/i,
    api: /^\/api\//i,
    projectPages: /^\/project\/[^/]+/,
    workspacePages: /\/workspace/,
    assets: /\/assets\//i,
  },
  
  limits: {
    images: 200,
    static: 100,
    pages: 50,
    projects: 30,
    bundles: 50,
  },
  
  ttl: {
    images: 30 * 24 * 60 * 60,
    static: 7 * 24 * 60 * 60,
    bundles: 7 * 24 * 60 * 60,
    api: 60 * 60,
    pages: 7 * 24 * 60 * 60,
    projects: 30 * 24 * 60 * 60,
  },
  
  offline: {
    maxRetries: 3,
    syncInterval: 5 * 60 * 1000,
    maxOfflineActions: 100,
  }
};