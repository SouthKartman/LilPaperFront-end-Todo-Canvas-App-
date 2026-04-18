// src/service-worker/strategies/networkFirst.ts
export async function networkFirst(
  request: Request,
  cacheName: string,
  timeout = 3000
): Promise<Response> {
  const cache = await caches.open(cacheName);
  
  try {
    // Пробуем получить из сети с таймаутом
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('Network timeout')), timeout);
    });
    
    const networkResponse = await Promise.race([
      fetch(request),
      timeoutPromise,
    ]);
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    // При ошибке сети или таймауте - возвращаем из кэша
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('[SW] Network failed, using cache:', request.url);
      return cachedResponse;
    }
    throw error;
  }
}