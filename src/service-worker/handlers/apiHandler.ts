// src/service-worker/handlers/apiHandler.ts
import { SW_CONFIG } from '../config/sw.config';
import { networkFirst } from '../strategies/networkFirst';

// Заглушка для будущего бэкенда
export async function handleApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  
  // Проверяем, является ли запрос API
  const isApi = SW_CONFIG.patterns.api.test(url.pathname);
  
  if (isApi) {
    // Для API используем network-first стратегию
    // Пока API нет, просто проксируем запрос
    try {
      return await networkFirst(request, SW_CONFIG.cacheNames.api);
    } catch (error) {
      // Если API не доступен, возвращаем офлайн-ответ
      return new Response(
        JSON.stringify({
          offline: true,
          message: 'Вы офлайн. Данные будут синхронизированы при подключении к интернету.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
  
  return null;
}