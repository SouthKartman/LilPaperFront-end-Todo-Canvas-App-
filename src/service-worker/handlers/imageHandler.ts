// src/service-worker/handlers/imageHandler.ts
import { SW_CONFIG } from '../config/sw.config';

export async function handleImageRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  
  // Проверяем, является ли запрос изображением
  const isImage = SW_CONFIG.patterns.images.test(url.pathname) ||
                  request.destination === 'image';
  
  if (!isImage) return null;
  
  const cache = await caches.open(SW_CONFIG.cacheNames.images);
  
  try {
    // Сначала проверяем кэш
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Фоновое обновление только если онлайн
      if (navigator.onLine) {
        fetch(request).then(response => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
        }).catch(() => {});
      }
      
      return cachedResponse;
    }
    
    // Если нет в кэше - сеть
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Кэшируем только если не dev
      if (!isDevResource(url)) {
        await cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('[ImageHandler] Сеть недоступна, проверяем кэш:', url.pathname);
    
    // Пробуем еще раз кэш (на случай гонки)
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;
    
    // Fallback изображение
    return await generateFallbackImage();
  }
}

function isDevResource(url: URL): boolean {
  return url.hostname === 'localhost' || url.port === '3000';
}

async function generateFallbackImage(): Promise<Response> {
  // SVG заглушка
  const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#f0f0f0"/>
    <text x="50" y="50" font-family="Arial" font-size="14" fill="#999" text-anchor="middle" dy=".3em">
      🖼️
    </text>
  </svg>`;
  
  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache'
    }
  });
}