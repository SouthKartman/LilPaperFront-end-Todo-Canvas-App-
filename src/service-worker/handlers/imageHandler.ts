// src/service-worker/handlers/imageHandler.ts
import { SW_CONFIG } from '../config/sw.config';
import { staleWhileRevalidate } from '../strategies/staleWhileRevalidate';

export async function handleImageRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  
  // Проверяем, является ли запрос изображением
  const isImage = SW_CONFIG.patterns.images.test(url.pathname);
  
  if (isImage) {
    return await staleWhileRevalidate(request, SW_CONFIG.cacheNames.images);
  }
  
  return null;
}