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
        type: 'classic',
      });
      
      console.log(`[SW] ✅ Зарегистрирован v${SW_CONFIG.version}:`, this.registration);
      
      // Ждем активации
      await navigator.serviceWorker.ready;
      
      // Проверяем обновления
      this.registration.update().catch(err => {
        console.warn('[SW] ⚠️ Ошибка проверки обновлений:', err);
      });
      
      // Слушаем обновления
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          console.log('[SW] 🔄 Найдено обновление');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] 🎉 Новая версия готова!');
              this.showUpdateNotification();
            }
          });
        }
      });
      
      // Слушаем сообщения от SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleMessage(event.data);
      });
      
      // ✅ Регистрируем фоновую синхронизацию только если SW активен
      if (this.registration.active && 'sync' in this.registration) {
        try {
          await this.registration.sync.register('sync-data');
          console.log('[SW] ✅ Фоновая синхронизация зарегистрирована');
        } catch (syncError) {
          // Это нормально для некоторых браузеров/окружений
          console.log('[SW] ℹ️ Фоновая синхронизация не требуется');
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('[SW] ❌ Ошибка регистрации:', error);
      return false;
    }
  }
  
  async unregister(): Promise<boolean> {
    if (!this.registration) return false;
    
    try {
      const success = await this.registration.unregister();
      if (success) {
        console.log('[SW] 🗑️ Service Worker удален');
        this.registration = null;
      }
      return success;
    } catch (error) {
      console.error('[SW] ❌ Ошибка удаления:', error);
      return false;
    }
  }
  
  async update(): Promise<void> {
    if (this.registration) {
      try {
        await this.registration.update();
        console.log('[SW] 🔄 Проверка обновлений...');
      } catch (error) {
        console.warn('[SW] ⚠️ Ошибка обновления:', error);
      }
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
    const updateEvent = new CustomEvent('sw-update-available', {
      detail: { 
        version: SW_CONFIG.version,
        message: 'Доступна новая версия приложения. Обновите страницу.'
      },
    });
    window.dispatchEvent(updateEvent);
  }
  
  private handleMessage(data: any): void {
    if (!data) return;
    
    console.log('[SW] 📨 Сообщение от SW:', data.type);
    
    switch (data.type) {
      case 'SYNC_START':
        window.dispatchEvent(new CustomEvent('sync-start', { detail: data }));
        break;
        
      case 'SYNC_COMPLETE':
        window.dispatchEvent(new CustomEvent('sync-complete', { detail: data }));
        break;
        
      case 'SYNC_ERROR':
        window.dispatchEvent(new CustomEvent('sync-error', { detail: data }));
        break;
        
      default:
        // Игнорируем неизвестные сообщения
        break;
    }
  }
}

// Экспортируем удобные функции
export const registerServiceWorker = () => ServiceWorkerManager.getInstance().register();
export const unregisterServiceWorker = () => ServiceWorkerManager.getInstance().unregister();
export const getSWStatus = () => ServiceWorkerManager.getInstance().getStatus();
export const updateServiceWorker = () => ServiceWorkerManager.getInstance().update();

// Автоматическая регистрация в production
if (import.meta.env.PROD) {
  registerServiceWorker();
}