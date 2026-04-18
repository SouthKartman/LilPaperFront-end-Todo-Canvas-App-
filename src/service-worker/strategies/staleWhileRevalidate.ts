// src/service-worker/strategies/staleWhileRevalidate.ts
export async function staleWhileRevalidate(
  request: Request, 
  cacheName: string
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Фоновое обновление
  const fetchPromise = fetch(request).then(async (response) => {
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  }).catch(error => {
    console.log('[SW] Network error, using cache:', error);
    return null;
  });

  // Возвращаем кэш или ждем сеть
  return cachedResponse || await fetchPromise;
}

// src/service-worker/strategies/cacheFirst.ts
export async function cacheFirst(
  request: Request, 
  cacheName?: string
): Promise<Response> {
  const cache = await caches.open(cacheName || 'static-cache');
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    throw new Error(`Failed to fetch ${request.url}`);
  }
}