// src/service-worker/sw.ts
import { precacheAndRoute } from 'workbox-precaching';
import { SW_CONFIG } from './config/sw.config';
import { swDb } from './storage/swSchema';
import { syncManager } from './storage/syncManager';
import { handlePageRequest } from './handlers/pageHandler';
import { handleStaticRequest } from './handlers/staticHandler';
import { handleImageRequest } from './handlers/imageHandler';
import { handleApiRequest } from './handlers/apiHandler';
import { handleFontRequest } from './handlers/fontHandler';

declare const self: ServiceWorkerGlobalScope;

// Определяем режим работы
const IS_DEVELOPMENT = self.location.hostname === 'localhost' || 
                       self.location.port === '3000' ||
                       self.location.hostname.includes('127.0.0.1');

console.log(`[SW] Режим: ${IS_DEVELOPMENT ? 'DEVELOPMENT' : 'PRODUCTION'}`);

// В dev режиме НЕ используем precacheAndRoute
if (!IS_DEVELOPMENT) {
  precacheAndRoute(self.__WB_MANIFEST);
} else {
  console.log('[SW] 🔧 Dev режим - Workbox precaching отключен');
}

// Установка
self.addEventListener('install', (event) => {
  console.log('[SW] 🚀 Установка Lil Papper');
  
  event.waitUntil(
    (async () => {
      try {
        if (!IS_DEVELOPMENT) {
          await swDb.open();
          const staticCache = await caches.open(SW_CONFIG.cacheNames.static);
          await staticCache.addAll(SW_CONFIG.staticAssets);
          console.log('[SW] ✅ Статические файлы закэшированы');
        } else {
          console.log('[SW] 🔧 Development режим - кэширование отключено');
        }
        
        await self.skipWaiting();
      } catch (error) {
        console.error('[SW] ❌ Ошибка установки:', error);
      }
    })()
  );
});

// Активация
self.addEventListener('activate', (event) => {
  console.log('[SW] 🔄 Активация');
  
  event.waitUntil(
    (async () => {
      if (!IS_DEVELOPMENT) {
        const cacheNames = await caches.keys();
        const validCacheNames = Object.values(SW_CONFIG.cacheNames);
        
        await Promise.all(
          cacheNames
            .filter(name => !validCacheNames.includes(name))
            .map(name => caches.delete(name))
        );
        
        await syncManager.syncOfflineActions();
        await syncManager.performMaintenance();
      }
      
      await self.clients.claim();
      console.log('[SW] ✅ Активация завершена');
    })()
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // ВАЖНО: В dev режиме пропускаем ВСЕ запросы кроме navigation
  if (IS_DEVELOPMENT) {
    // Пропускаем все Vite-specific запросы
    if (url.pathname.startsWith('/@') ||
        url.pathname.startsWith('/src/') ||
        url.pathname.startsWith('/node_modules/') ||
        url.pathname.includes('__x00__') ||
        url.pathname.includes('@vite') ||
        url.pathname.includes('@react-refresh') ||
        url.pathname.includes('@fs/') ||
        url.pathname.includes('vite')) {
      return; // Вообще не перехватываем
    }
    
    // Только для навигации в dev режиме
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request).catch(async () => {
          // Офлайн страница для dev
          const cache = await caches.open('dev-cache');
          const cached = await cache.match('/index.html');
          return cached || new Response('Dev offline - restart Vite', { status: 503 });
        })
      );
    }
    
    return; // Все остальные запросы пропускаем
  }
  
  // ============ PRODUCTION РЕЖИМ ============
  
  // Только запросы к нашему origin
  if (url.origin !== self.location.origin) return;
  
  event.respondWith(
    (async () => {
      try {
        // 1. Навигация (страницы)
        if (request.mode === 'navigate') {
          const pageResponse = await handlePageRequest(request);
          if (pageResponse) return pageResponse;
        }
        
        // 2. Статические ресурсы
        const staticResponse = await handleStaticRequest(request);
        if (staticResponse) return staticResponse;
        
        // 3. Изображения
        const imageResponse = await handleImageRequest(request);
        if (imageResponse) return imageResponse;
        
        // 4. Шрифты
        const fontResponse = await handleFontRequest(request);
        if (fontResponse) return fontResponse;
        
        // 5. API
        const apiResponse = await handleApiRequest(request);
        if (apiResponse) return apiResponse;
        
        // 6. Всё остальное - сеть
        return await fetch(request);
        
      } catch (error) {
        console.error('[SW] ❌ Ошибка обработки:', url.pathname, error);
        
        // Для навигации - офлайн страница
        if (request.mode === 'navigate') {
          const mainPage = await swDb.getPage('/');
          if (mainPage) {
            return new Response(mainPage.html, {
              status: 200,
              headers: { 'Content-Type': 'text/html' }
            });
          }
          
          const cache = await caches.open(SW_CONFIG.cacheNames.static);
          return await cache.match('/index.html') || 
                 new Response('Offline', { status: 503 });
        }
        
        throw error;
      }
    })()
  );
});

// Остальные обработчики (sync, message, push) оставляем как есть
// но с проверкой IS_DEVELOPMENT

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;
  
  if (IS_DEVELOPMENT) {
    console.log('[SW] 📨 Dev сообщение:', type);
    
    if (type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
    
    if (event.ports[0]) {
      event.ports[0].postMessage({ 
        success: true, 
        isDevelopment: true 
      });
    }
    return;
  }
  
  // Production обработка сообщений
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'QUEUE_OFFLINE_ACTION':
      await swDb.queueAction(payload);
      if ('sync' in self.registration) {
        await self.registration.sync.register('sync-offline-actions');
      }
      if (event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
      break;
      
    case 'CACHE_PROJECT':
      await syncManager.cacheProjectForOffline(payload.projectId);
      if (event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
      break;
      
    case 'GET_OFFLINE_STATUS':
      if (event.ports[0]) {
        const pendingActions = await swDb.getPendingActions();
        const cachedPages = await swDb.cachedPages.count();
        
        event.ports[0].postMessage({
          pendingActions: pendingActions.length,
          cachedPages,
          isDevelopment: false
        });
      }
      break;
  }
});

self.addEventListener('sync', (event) => {
  if (IS_DEVELOPMENT) return;
  
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncManager.syncOfflineActions());
  }
});

self.addEventListener('push', (event) => {
  if (IS_DEVELOPMENT) return;
  
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Lil Papper', {
        body: data.body || 'Обновления в проекте',
        icon: '/Logo.png',
        badge: '/Logo.png',
        data: { url: data.url || '/' }
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

export {};