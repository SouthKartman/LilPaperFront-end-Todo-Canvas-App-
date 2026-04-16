// src/features/storage/lib/useOfflineReady.ts
import { useEffect, useState } from 'react';

export const useOfflineReady = () => {
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [cachedAssets, setCachedAssets] = useState<string[]>([]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkOfflineReady = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Проверяем кэши
        const cacheNames = await caches.keys();
        const staticCache = cacheNames.find(name => name.includes('static'));
        
        if (staticCache) {
          const cache = await caches.open(staticCache);
          const keys = await cache.keys();
          const urls = keys.map(req => req.url);
          setCachedAssets(urls);
          
          // Проверяем наличие критических ресурсов
          const hasCritical = urls.some(url => 
            url.includes('index.html') || 
            url.includes('.js') || 
            url.includes('.css')
          );
          
          setIsOfflineReady(hasCritical);
        }
      } catch (error) {
        console.error('Ошибка проверки офлайн-готовности:', error);
      }
    };

    // Проверяем при загрузке и при обновлении SW
    checkOfflineReady();
    
    navigator.serviceWorker.addEventListener('controllerchange', checkOfflineReady);
    
    // Периодическая проверка
    const interval = setInterval(checkOfflineReady, 30000);
    
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', checkOfflineReady);
      clearInterval(interval);
    };
  }, []);

  return { isOfflineReady, cachedAssets };
};