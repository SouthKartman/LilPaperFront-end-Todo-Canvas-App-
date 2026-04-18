// src/features/storage/lib/useServiceWorkerSync.ts
import { useEffect, useCallback, useState } from 'react';
import { useAppDispatch } from '@shared/lib/state/store';

interface OfflineStatus {
  pendingActions: number;
  cachedPages: number;
  isOnline: boolean;
}

export const useServiceWorkerSync = () => {
  const [status, setStatus] = useState<OfflineStatus>({
    pendingActions: 0,
    cachedPages: 0,
    isOnline: navigator.onLine
  });
  
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Обработчик сообщений от SW
    const handleMessage = (event: MessageEvent) => {
      const { type, projectId } = event.data;
      
      switch (type) {
        case 'PROJECT_OFFLINE_READY':
          console.log(`[App] Проект ${projectId} готов к офлайн-работе`);
          // Можно показать уведомление
          break;
          
        case 'SYNC_COMPLETE':
          console.log('[App] Синхронизация завершена');
          updateStatus();
          break;
      }
    };

    // Обработчик онлайн/офлайн
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      // Запускаем синхронизацию при появлении сети
      syncNow();
    };
    
    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Получаем начальный статус
    updateStatus();

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateStatus = useCallback(async () => {
    const registration = await navigator.serviceWorker.ready;
    
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        setStatus(prev => ({
          ...prev,
          ...event.data
        }));
        resolve(event.data);
      };
      
      registration.active?.postMessage(
        { type: 'GET_OFFLINE_STATUS' },
        [channel.port2]
      );
    });
  }, []);

  const queueOfflineAction = useCallback(async (
    type: string,
    payload: any
  ) => {
    const registration = await navigator.serviceWorker.ready;
    
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        updateStatus(); // Обновляем статус
        resolve(event.data);
      };
      
      registration.active?.postMessage({
        type: 'QUEUE_OFFLINE_ACTION',
        payload: { type, ...payload }
      }, [channel.port2]);
    });
  }, []);

  const cacheProject = useCallback(async (projectId: string) => {
    const registration = await navigator.serviceWorker.ready;
    
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };
      
      registration.active?.postMessage({
        type: 'CACHE_PROJECT',
        payload: { projectId }
      }, [channel.port2]);
    });
  }, []);

  const syncNow = useCallback(async () => {
    if ('sync' in navigator.serviceWorker) {
      const registration = await navigator.serviceWorker.ready;
      // @ts-ignore
      await registration.sync.register('sync-offline-actions');
      updateStatus();
    }
  }, []);

  return {
    status,
    queueOfflineAction,
    cacheProject,
    syncNow,
    updateStatus
  };
};