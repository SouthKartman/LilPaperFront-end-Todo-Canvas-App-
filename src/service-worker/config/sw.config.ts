// src/service-worker/config/sw.config.ts
export const SW_CONFIG = {
  version: '1.0.0',
  cacheNames: {
    static: `static-${Date.now()}`,
    images: `images-${Date.now()}`,
    api: `api-${Date.now()}`,
    fonts: `fonts-${Date.now()}`,
  },
  
  // Статические файлы для кэширования
  staticAssets: [
    '/',
    '/index.html',
    '/manifest.json',
    '/Logo.png',
    '/favicon.ico',
  ],
  
  // Регулярные выражения для разных типов запросов
  patterns: {
    images: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/i,
    fonts: /\.(woff|woff2|ttf|eot)$/i,
    js: /\.js$/i,
    css: /\.css$/i,
    api: /^\/api\//i, // Для будущего бэкенда
  },
  
  // Максимальное количество файлов в кэше
  limits: {
    images: 100,
    static: 50,
  },
  
  // Время жизни кэша (в секундах)
  ttl: {
    images: 30 * 24 * 60 * 60, // 30 дней
    static: 24 * 60 * 60, // 1 день
    api: 60 * 60, // 1 час
  },
};