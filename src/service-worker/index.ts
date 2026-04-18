// src/service-worker/index.ts
import { SW_CONFIG } from './config/sw.config';

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported = false;
  
  private constructor() {
    this.isSupported = 'serviceWorker' in navigator;
  }
  
  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }
  
  async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[SW] Service Worker не поддерживается');
      return false;
    }
    
    try {
      // Регистрируем SW
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      
      console.log('[SW] Зарегистрирован:', this.registration);
      
      // Проверяем обновления
      this.registration.update();
      
      // Слушаем обновления
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          console.log('[SW] Найдено обновление');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] Новая версия готова');
              // Показываем уведомление о обновлении
              this.showUpdateNotification();
            }
          });
        }
      });
      
      // Слушаем сообщения от SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleMessage(event.data);
      });
      
      // Регистрируем фоновую синхронизацию (если есть)
      if ('sync' in this.registration) {
        try {
          await this.registration.sync.register('sync-data');
          console.log('[SW] Фоновая синхронизация зарегистрирована');
        } catch (error) {
          console.warn('[SW] Фоновая синхронизация не поддерживается:', error);
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('[SW] Ошибка регистрации:', error);
      return false;
    }
  }
  
  async unregister(): Promise<boolean> {
    if (!this.registration) return false;
    
    try {
      const success = await this.registration.unregister();
      if (success) {
        console.log('[SW] Удален');
      }
      return success;
    } catch (error) {
      console.error('[SW] Ошибка удаления:', error);
      return false;
    }
  }
  
  async getStatus(): Promise<{
    isSupported: boolean;
    isRegistered: boolean;
    isControlled: boolean;
    version: string;
  }> {
    const isControlled = !!navigator.serviceWorker.controller;
    
    return {
      isSupported: this.isSupported,
      isRegistered: !!this.registration,
      isControlled,
      version: SW_CONFIG.version,
    };
  }
  
  private showUpdateNotification(): void {
    // Создаем уведомление о обновлении
    const updateEvent = new CustomEvent('sw-update-available', {
      detail: { version: SW_CONFIG.version },
    });
    window.dispatchEvent(updateEvent);
  }
  
  private handleMessage(data: any): void {
    console.log('[SW] Сообщение от сервис-воркера:', data);
    
    switch (data.type) {
      case 'SYNC_START':
        window.dispatchEvent(new CustomEvent('sync-start', { detail: data }));
        break;
        
      case 'SYNC_COMPLETE':
        window.dispatchEvent(new CustomEvent('sync-complete', { detail: data }));
        break;
        
      default:
        console.log('[SW] Неизвестное сообщение:', data.type);
    }
  }
}

// Экспортируем удобные функции
export const registerServiceWorker = () => ServiceWorkerManager.getInstance().register();
export const unregisterServiceWorker = () => ServiceWorkerManager.getInstance().unregister();
export const getSWStatus = () => ServiceWorkerManager.getInstance().getStatus();