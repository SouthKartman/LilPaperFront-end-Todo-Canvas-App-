// src/service-worker/sw.ts
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

import { SW_CONFIG } from './config/sw.config';
import { handleStaticRequest } from './handlers/staticHandler';
import { handleImageRequest } from './handlers/imageHandler';
import { handleApiRequest } from './handlers/apiHandler';
import { handleFontRequest } from './handlers/fontHandler';

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Установка версии:', SW_CONFIG.version);
  
  event.waitUntil(
    (async () => {
      // Создаем кэш для статики
      const staticCache = await caches.open(SW_CONFIG.cacheNames.static);
      await staticCache.addAll(SW_CONFIG.staticAssets);
      
      console.log('[SW] Статические файлы закэшированы');
      
      // Активируем SW сразу после установки
      self.skipWaiting();
    })()
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация версии:', SW_CONFIG.version);
  
  event.waitUntil(
    (async () => {
      // Удаляем старые кэши
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => 
        name !== SW_CONFIG.cacheNames.static &&
        name !== SW_CONFIG.cacheNames.images &&
        name !== SW_CONFIG.cacheNames.api &&
        name !== SW_CONFIG.cacheNames.fonts
      );
      
      await Promise.all(oldCaches.map(name => caches.delete(name)));
      console.log('[SW] Удалено старых кэшей:', oldCaches.length);
      
      // Принимаем контроль над всеми клиентами
      await self.clients.claim();
    })()
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Пропускаем запросы не из нашего origin
  if (url.origin !== self.location.origin) {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        // Пробуем обработать запрос разными обработчиками
        let response = await handleStaticRequest(request);
        if (response) return response;
        
        response = await handleImageRequest(request);
        if (response) return response;
        
        response = await handleFontRequest(request);
        if (response) return response;
        
        response = await handleApiRequest(request);
        if (response) return response;
        
        // Если ничего не подошло - идем в сеть
        return await fetch(request);
        
      } catch (error) {
        console.error('[SW] Ошибка обработки запроса:', request.url, error);
        
        // Возвращаем офлайн-страницу для навигационных запросов
        if (request.mode === 'navigate') {
          const cache = await caches.open(SW_CONFIG.cacheNames.static);
          const offlinePage = await cache.match('/index.html');
          if (offlinePage) return offlinePage;
        }
        
        throw error;
      }
    })()
  );
});

// Фоновая синхронизация (заглушка для будущего бэкенда)
self.addEventListener('sync', (event) => {
  console.log('[SW] Событие синхронизации:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      (async () => {
        // Здесь будет логика синхронизации с бэкендом
        console.log('[SW] Запуск фоновой синхронизации данных');
        
        // Получаем все клиенты
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          // Отправляем сообщение клиенту о начале синхронизации
          client.postMessage({
            type: 'SYNC_START',
            timestamp: Date.now(),
          });
        });
        
        // Здесь будет логика отправки данных на сервер
        // await syncDataToServer();
        
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_COMPLETE',
            timestamp: Date.now(),
          });
        });
      })()
    );
  }
});

// Обработка push-уведомлений (заглушка)
self.addEventListener('push', (event) => {
  console.log('[SW] Push уведомление:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Lil Papper', {
        body: data.body || 'Новые обновления',
        icon: '/Logo.png',
        badge: '/Logo.png',
        data: {
          url: data.url || '/',
        },
      })
    );
  }
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clients) => {
      // Проверяем, есть ли уже открытое окно с этим URL
      for (const client of clients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Если нет, открываем новое
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Сообщения от клиента
self.addEventListener('message', (event) => {
  console.log('[SW] Получено сообщение:', event.data);
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'REGISTER_SYNC':
      if ('sync' in self.registration) {
        event.waitUntil(
          self.registration.sync.register('sync-data')
        );
      }
      break;
      
    default:
      console.log('[SW] Неизвестный тип сообщения:', event.data.type);
  }
});