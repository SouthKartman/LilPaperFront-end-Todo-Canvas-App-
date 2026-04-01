// src/service-worker/strategies/staleWhileRevalidate.ts
export async function staleWhileRevalidate(
  request: Request,
  cacheName: string
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(error => {
    console.warn('[SW] Network error, using cache:', error);
    return cachedResponse;
  });
  
  return cachedResponse || fetchPromise;
}