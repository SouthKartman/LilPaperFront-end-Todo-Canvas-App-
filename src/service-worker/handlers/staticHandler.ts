// src/service-worker/handlers/staticHandler.ts
import { SW_CONFIG } from '../config/sw.config';
import { cacheFirst } from '../strategies/cacheFirst';

export async function handleStaticRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  
  // Проверяем, нужно ли кэшировать этот статический файл
  const isStatic = 
    SW_CONFIG.patterns.js.test(url.pathname) ||
    SW_CONFIG.patterns.css.test(url.pathname) ||
    SW_CONFIG.staticAssets.includes(url.pathname);
  
  if (isStatic) {
    return await cacheFirst(request);
  }
  
  return null;
}