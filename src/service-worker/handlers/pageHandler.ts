// src/service-worker/handlers/pageHandler.ts
import { swDb } from '../storage/swSchema';
import { SW_CONFIG } from '../config/sw.config';

const IS_DEVELOPMENT = self.location.hostname === 'localhost';

export async function handlePageRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  
  const isPageRequest = request.mode === 'navigate' || 
                        request.headers.get('accept')?.includes('text/html');
  
  if (!isPageRequest) return null;

  try {
    // В development не кэшируем страницы
    if (IS_DEVELOPMENT) {
      try {
        return await fetch(request);
      } catch {
        return await getOfflinePage();
      }
    }
    
    // Production логика
    const cachedPage = await swDb.getPage(url.pathname);
    
    // Запускаем сетевой запрос в фоне
    const networkPromise = fetch(request).then(async (response) => {
      if (response.ok) {
        const html = await response.clone().text();
        
        await swDb.cachePage(
          url.pathname, 
          html,
          extractProjectId(url.pathname)
        );
        
        const cache = await caches.open(SW_CONFIG.cacheNames.pages);
        await cache.put(request, response.clone());
      }
      return response;
    }).catch(() => null);

    // Если есть в IndexedDB - возвращаем сразу
    if (cachedPage) {
      networkPromise; // Фоновое обновление
      
      return new Response(cachedPage.html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          'X-SW-Cache': 'IndexedDB'
        }
      });
    }

    // Пробуем Cache API
    const cache = await caches.open(SW_CONFIG.cacheNames.pages);
    const cacheResponse = await cache.match(request);
    
    if (cacheResponse) {
      networkPromise;
      return cacheResponse;
    }

    // Ждем сеть
    const networkResponse = await networkPromise;
    if (networkResponse) return networkResponse;

    // Офлайн страница
    return await getOfflinePage();

  } catch (error) {
    console.error('[PageHandler] Ошибка:', error);
    return await getOfflinePage();
  }
}

async function getOfflinePage(): Promise<Response> {
  // Пробуем IndexedDB
  const mainPage = await swDb.getPage('/');
  if (mainPage) {
    return new Response(mainPage.html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // Cache API
  const cache = await caches.open(SW_CONFIG.cacheNames.static);
  const cachedOffline = await cache.match('/index.html');
  if (cachedOffline) return cachedOffline;
  
  // Генерируем страницу
  return new Response(
    `<!DOCTYPE html>
    <html>
      <head><title>Lil Papper - Offline</title></head>
      <body style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: system-ui;">
        <div style="text-align: center;">
          <h1>📱 Lil Papper</h1>
          <p>Вы офлайн. Данные синхронизируются при подключении.</p>
          <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px;">
            Попробовать снова
          </button>
        </div>
        <script>
          window.addEventListener('online', () => location.reload());
        </script>
      </body>
    </html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
}

function extractProjectId(pathname: string): string | undefined {
  const match = pathname.match(/\/project\/([^/]+)/);
  return match ? match[1] : undefined;
}