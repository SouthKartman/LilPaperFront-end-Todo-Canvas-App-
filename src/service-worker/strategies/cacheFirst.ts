// src/service-worker/strategies/cacheFirst.ts
export async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open('static-cache');
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Cache hit:', request.url);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network failed for:', request.url);
    throw error;
  }
}