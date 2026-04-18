// src/service-worker/config/sw.config.ts
export const SW_CONFIG = {
  version: '2.0.1', // Обновляем версию
  
  cacheNames: {
    static: `static-v2.0.1`,
    images: `images-v2.0.1`,
    api: `api-v2.0.1`,
    fonts: `fonts-v2.0.1`,
    pages: `pages-v2.0.1`,
    projects: `projects-v2.0.1`,
    bundles: `bundles-v2.0.1`, // Новый кэш для JS/CSS бандлов
  },
  
  // ВСЕ статические файлы для предварительного кэширования
  staticAssets: [
    '/',
    '/index.html',
    '/manifest.json',
    '/Logo.png',
    '/favicon.ico',
  ],
  
  patterns: {
    images: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/i,
    fonts: /\.(woff|woff2|ttf|eot)$/i,
    js: /\.js(\?.*)?$/i,
    css: /\.css(\?.*)?$/i,
    api: /^\/api\//i,
    projectPages: /^\/project\/[^/]+/,
    workspacePages: /\/workspace/,
    assets: /\/assets\//i, // Vite ассеты
  },
  
  // Увеличиваем лимиты для офлайн-работы
  limits: {
    images: 200,
    static: 100,
    pages: 50,
    projects: 30,
    bundles: 50, // Для JS/CSS файлов
  },
  
  ttl: {
    images: 30 * 24 * 60 * 60, // 30 дней
    static: 7 * 24 * 60 * 60, // 7 дней
    bundles: 7 * 24 * 60 * 60, // 7 дней для бандлов
    api: 60 * 60,
    pages: 7 * 24 * 60 * 60,
    projects: 30 * 24 * 60 * 60,
  },
  
  // Настройки офлайн-режима
  offline: {
    maxRetries: 3,
    syncInterval: 5 * 60 * 1000,
    maxOfflineActions: 100,
  }
};