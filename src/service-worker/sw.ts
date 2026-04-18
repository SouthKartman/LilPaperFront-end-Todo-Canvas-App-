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
console.log(`[SW] Версия: ${SW_CONFIG.version}`);

// В dev режиме НЕ используем precacheAndRoute
if (!IS_DEVELOPMENT) {
  try {
    precacheAndRoute(self.__WB_MANIFEST);
  } catch (error) {
    console.error('[SW] Ошибка precache:', error);
  }
} else {
  console.log('[SW] 🔧 Dev режим - Workbox precaching отключен');
}

// ============ УСТАНОВКА ============
self.addEventListener('install', (event) => {
  console.log('[SW] 🚀 Установка Lil Papper v' + SW_CONFIG.version);
  
  event.waitUntil(
    (async () => {
      try {
        if (!IS_DEVELOPMENT) {
          // Открываем IndexedDB
          await swDb.open().catch(err => {
            console.warn('[SW] ⚠️ Ошибка открытия IndexedDB:', err);
          });
          
          const staticCache = await caches.open(SW_CONFIG.cacheNames.static);
          
          // ✅ Кэшируем обязательные файлы (безопасно)
          console.log('[SW] 📦 Кэширование обязательных файлов...');
          for (const url of SW_CONFIG.staticAssets) {
            try {
              const response = await fetch(url, { 
                cache: 'reload',
                credentials: 'same-origin'
              });
              if (response.ok) {
                await staticCache.put(url, response);
                console.log(`[SW]   ✅ ${url}`);
              } else {
                console.warn(`[SW]   ⚠️ ${url} (${response.status})`);
              }
            } catch (error) {
              console.warn(`[SW]   ⚠️ ${url} - ${error}`);
            }
          }
          
          // ✅ Кэшируем опциональные файлы (если есть)
          console.log('[SW] 📦 Кэширование опциональных файлов...');
          for (const url of SW_CONFIG.optionalAssets) {
            try {
              const response = await fetch(url, { 
                cache: 'reload',
                credentials: 'same-origin'
              });
              if (response.ok) {
                await staticCache.put(url, response);
                console.log(`[SW]   ✅ ${url}`);
              }
            } catch {
              // Игнорируем ошибки для опциональных файлов
            }
          }
          
          console.log('[SW] ✅ Кэширование завершено');
        } else {
          console.log('[SW] 🔧 Development режим - кэширование отключено');
        }
        
        await self.skipWaiting();
        console.log('[SW] ✅ Установка завершена');
      } catch (error) {
        console.error('[SW] ❌ Ошибка установки:', error);
        // Не прерываем установку
        await self.skipWaiting();
      }
    })()
  );
});

// ============ АКТИВАЦИЯ ============
self.addEventListener('activate', (event) => {
  console.log('[SW] 🔄 Активация v' + SW_CONFIG.version);
  
  event.waitUntil(
    (async () => {
      try {
        if (!IS_DEVELOPMENT) {
          // Очистка старых кэшей
          const cacheNames = await caches.keys();
          const validCacheNames = Object.values(SW_CONFIG.cacheNames);
          
          const deletedCaches = cacheNames.filter(name => !validCacheNames.includes(name));
          
          await Promise.all(
            deletedCaches.map(name => {
              console.log(`[SW] 🗑️ Удален старый кэш: ${name}`);
              return caches.delete(name);
            })
          );
          
          // Синхронизация офлайн-действий
          try {
            await syncManager.syncOfflineActions();
          } catch (syncError) {
            console.warn('[SW] ⚠️ Ошибка синхронизации:', syncError);
          }
          
          // Обслуживание БД
          try {
            await syncManager.performMaintenance();
          } catch (maintError) {
            console.warn('[SW] ⚠️ Ошибка обслуживания:', maintError);
          }
        }
        
        await self.clients.claim();
        console.log('[SW] ✅ Активация завершена');
      } catch (error) {
        console.error('[SW] ❌ Ошибка активации:', error);
        await self.clients.claim();
      }
    })()
  );
});

// ============ FETCH ============
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // ВАЖНО: В dev режиме пропускаем ВСЕ запросы кроме navigation
  if (IS_DEVELOPMENT) {
    if (url.pathname.startsWith('/@') ||
        url.pathname.startsWith('/src/') ||
        url.pathname.startsWith('/node_modules/') ||
        url.pathname.includes('__x00__') ||
        url.pathname.includes('@vite') ||
        url.pathname.includes('@react-refresh') ||
        url.pathname.includes('@fs/') ||
        url.pathname.includes('vite')) {
      return;
    }
    
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request).catch(async () => {
          const cache = await caches.open('dev-cache');
          const cached = await cache.match('/index.html');
          return cached || new Response('Dev offline - restart Vite', { status: 503 });
        })
      );
    }
    
    return;
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
          try {
            const mainPage = await swDb.getPage('/');
            if (mainPage) {
              return new Response(mainPage.html, {
                status: 200,
                headers: { 'Content-Type': 'text/html' }
              });
            }
          } catch (dbError) {
            console.warn('[SW] Ошибка получения страницы из БД:', dbError);
          }
          
          const cache = await caches.open(SW_CONFIG.cacheNames.static);
          const cached = await cache.match('/index.html');
          return cached || new Response('Offline', { status: 503 });
        }
        
        throw error;
      }
    })()
  );
});

// ============ MESSAGE ============
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
        isDevelopment: true,
        version: SW_CONFIG.version
      });
    }
    return;
  }
  
  // Production обработка сообщений
  console.log('[SW] 📨 Сообщение:', type);
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'QUEUE_OFFLINE_ACTION':
      try {
        await swDb.queueAction(payload);
        if ('sync' in self.registration) {
          await self.registration.sync.register('sync-offline-actions');
        }
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      } catch (error) {
        console.error('[SW] Ошибка QUEUE_OFFLINE_ACTION:', error);
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: String(error) });
        }
      }
      break;
      
    case 'CACHE_PROJECT':
      try {
        await syncManager.cacheProjectForOffline(payload.projectId);
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      } catch (error) {
        console.error('[SW] Ошибка CACHE_PROJECT:', error);
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: String(error) });
        }
      }
      break;
      
    case 'GET_OFFLINE_STATUS':
      if (event.ports[0]) {
        try {
          const pendingActions = await swDb.getPendingActions();
          const cachedPages = await swDb.cachedPages.count();
          
          event.ports[0].postMessage({
            pendingActions: pendingActions.length,
            cachedPages,
            isDevelopment: false,
            version: SW_CONFIG.version
          });
        } catch (error) {
          event.ports[0].postMessage({
            pendingActions: 0,
            cachedPages: 0,
            error: String(error),
            version: SW_CONFIG.version
          });
        }
      }
      break;
      
    default:
      console.log('[SW] Неизвестный тип сообщения:', type);
      if (event.ports[0]) {
        event.ports[0].postMessage({ 
          success: false, 
          error: 'Unknown message type' 
        });
      }
  }
});

// ============ SYNC ============
self.addEventListener('sync', (event) => {
  if (IS_DEVELOPMENT) {
    console.log('[SW] 🔧 Dev режим - sync игнорируется:', event.tag);
    return;
  }
  
  console.log('[SW] 🔄 Sync событие:', event.tag);
  
  if (event.tag === 'sync-offline-actions' || event.tag === 'sync-data') {
    event.waitUntil(
      syncManager.syncOfflineActions().catch(error => {
        console.error('[SW] ❌ Ошибка синхронизации:', error);
      })
    );
  }
});

// ============ PUSH ============
self.addEventListener('push', (event) => {
  if (IS_DEVELOPMENT) {
    console.log('[SW] 🔧 Dev режим - push уведомление');
    return;
  }
  
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'Lil Papper';
      const options = {
        body: data.body || 'Обновления в проекте',
        icon: '/Logo.png',
        badge: '/Logo.png',
        data: { url: data.url || '/' }
      };
      
      event.waitUntil(
        self.registration.showNotification(title, options).catch(error => {
          console.warn('[SW] ⚠️ Ошибка показа уведомления:', error);
        })
      );
    } catch (error) {
      console.error('[SW] ❌ Ошибка обработки push:', error);
    }
  }
});

// ============ NOTIFICATION CLICK ============
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