// src/service-worker/strategies/cacheFirst.ts
export async function cacheFirst(request: Request, cacheName?: string): Promise<Response> {
  const cache = await caches.open(cacheName || 'static-cache');
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  
  // Кэшируем только успешные ответы
  if (networkResponse.ok) {
    await cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// src/service-worker/strategies/networkFirst.ts
export async function networkFirst(
  request: Request, 
  cacheName: string,
  timeout = 3000
): Promise<Response> {
  const cache = await caches.open(cacheName);
  
  try {
    // Пробуем сеть с таймаутом
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), timeout)
      )
    ]);
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] Сеть недоступна, используем кэш:', request.url);
  }
  
  // Если сеть недоступна - отдаем из кэша
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Если ничего нет - ошибка
  throw new Error('No network and no cache');
}