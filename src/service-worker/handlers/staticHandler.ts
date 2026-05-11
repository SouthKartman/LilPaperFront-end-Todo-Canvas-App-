// src/service-worker/handlers/staticHandler.ts
import { SW_CONFIG } from '../config/sw.config';

export async function handleStaticRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  
  // Игнорируем Vite dev-ресурсы
  if (url.pathname.startsWith('/src/') || 
      url.pathname.startsWith('/node_modules/') ||
      url.pathname.includes('/@') ||
      url.pathname.includes('/@vite/') ||
      url.pathname.includes('/@fs/')) {
    // В development просто пропускаем, пусть Vite обрабатывает
    return null;
  }
  
  // Проверяем, нужно ли кэшировать этот файл
  const isStatic = 
    SW_CONFIG.patterns.js.test(url.pathname) ||
    SW_CONFIG.patterns.css.test(url.pathname) ||
    url.pathname.includes('/assets/') ||
    SW_CONFIG.staticAssets.includes(url.pathname);
  
  if (!isStatic) return null;
  
  const cache = await caches.open(SW_CONFIG.cacheNames.static);
  
  try {
    // Сначала проверяем кэш
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Фоновое обновление (только если онлайн)
      if (navigator.onLine) {
        fetch(request).then(response => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
        }).catch(() => {});
      }
      
      return cachedResponse;
    }
    
    // Если нет в кэше - пробуем сеть
    const networkResponse = await fetch(request);
    
    // Кэшируем только успешные ответы и только production ресурсы
    if (networkResponse.ok && !isDevResource(url)) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Если сеть недоступна и нет в кэше
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Для статических ресурсов в офлайне - возвращаем fallback
    if (request.destination === 'script') {
      return new Response('', { 
        status: 200, 
        headers: { 'Content-Type': 'application/javascript' } 
      });
    }
    
    if (request.destination === 'style') {
      return new Response('', { 
        status: 200, 
        headers: { 'Content-Type': 'text/css' } 
      });
    }
    
    throw error;
  }
}

function isDevResource(url: URL): boolean {
  return url.pathname.startsWith('/src/') ||
         url.pathname.startsWith('/node_modules/') ||
         url.pathname.includes('/@') ||
         url.port === '3000' || // Dev server port
         url.hostname === 'localhost';
}