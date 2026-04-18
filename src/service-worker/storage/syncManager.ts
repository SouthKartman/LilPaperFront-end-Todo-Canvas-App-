// src/service-worker/storage/syncManager.ts
import { swDb } from './swSchema';
import { db as mainDb } from '@shared/api/storage/indexedDB/schema';

export class SyncManager {
  // Синхронизация офлайн-действий с основной БД
  async syncOfflineActions(): Promise<void> {
    const pendingActions = await swDb.getPendingActions();
    
    for (const action of pendingActions) {
      try {
        await this.processAction(action);
        await swDb.markAsSynced(action.id);
        console.log(`[SW] ✅ Синхронизировано действие: ${action.type}`);
      } catch (error) {
        console.error(`[SW] ❌ Ошибка синхронизации ${action.type}:`, error);
        await swDb.incrementRetry(action.id);
        
        // Если больше 3 попыток - удаляем
        if (action.retryCount >= 3) {
          await swDb.offlineActions.delete(action.id);
        }
      }
    }
  }

  private async processAction(action: OfflineAction): Promise<void> {
    // Здесь будет логика синхронизации с основной БД
    switch (action.type) {
      case 'CREATE_PROJECT':
        // await mainDb.projects.add(action.payload);
        break;
        
      case 'UPDATE_TODO':
        // await mainDb.todos.update(action.payload.id, action.payload);
        break;
        
      case 'MOVE_NODE':
        // await mainDb.moveNodeBetweenPages(...);
        break;
        
      default:
        console.warn(`[SW] Неизвестный тип действия: ${action.type}`);
    }
  }

  // Кэширование данных проекта для офлайн-работы
  async cacheProjectForOffline(projectId: string): Promise<void> {
    try {
      // Получаем все данные проекта из основной БД
      const project = await mainDb.projects.get(projectId);
      if (!project) return;

      const pages = await mainDb.pages
        .where('projectId')
        .equals(projectId)
        .toArray();

      const nodes = await mainDb.getPageNodes(project.currentPageId);
      
      // Сохраняем в конфиг SW для быстрого доступа
      await swDb.config.put({
        key: `project_${projectId}_cache`,
        value: {
          project,
          pages,
          nodesCount: nodes.todos.length + nodes.images.length,
          cachedAt: Date.now()
        },
        updatedAt: Date.now()
      });

      console.log(`[SW] 📦 Проект ${projectId} закэширован для офлайн-работы`);
      
      // Уведомляем клиент
      await this.notifyClient('PROJECT_OFFLINE_READY', { projectId });
      
    } catch (error) {
      console.error(`[SW] Ошибка кэширования проекта ${projectId}:`, error);
    }
  }

  // Очистка кэша проекта
  async clearProjectCache(projectId: string): Promise<void> {
    await swDb.config.delete(`project_${projectId}_cache`);
    await swDb.deleteProjectPages(projectId);
  }

  // Уведомление клиента
  private async notifyClient(type: string, data: any): Promise<void> {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type, ...data });
    });
  }

  // Периодическая очистка
  async performMaintenance(): Promise<void> {
    // Очищаем старые действия
    await swDb.cleanupOldActions();
    
    // Очищаем старые страницы (старше 7 дней)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const oldPages = await swDb.cachedPages
      .where('timestamp')
      .below(weekAgo)
      .toArray();
    
    if (oldPages.length > 0) {
      await swDb.cachedPages.bulkDelete(oldPages.map(p => p.url));
      console.log(`[SW] 🧹 Очищено ${oldPages.length} старых страниц`);
    }
  }
}

export const syncManager = new SyncManager();