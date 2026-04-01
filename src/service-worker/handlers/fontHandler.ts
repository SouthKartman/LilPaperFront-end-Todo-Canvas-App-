// src/service-worker/handlers/fontHandler.ts
import { SW_CONFIG } from '../config/sw.config';
import { cacheFirst } from '../strategies/cacheFirst';

export async function handleFontRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  
  const isFont = SW_CONFIG.patterns.fonts.test(url.pathname);
  
  if (isFont) {
    return await cacheFirst(request);
  }
  
  return null;
}