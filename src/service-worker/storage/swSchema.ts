// src/service-worker/storage/swSchema.ts
import Dexie, { Table } from 'dexie';

// Интерфейсы для кэширования страниц
export interface CachedPage {
  url: string;
  html: string;
  timestamp: number;
  projectId?: string;
  pageId?: string;
  metadata: {
    title: string;
    preview?: string;
    lastModified: number;
  };
}

export interface OfflineAction {
  id: string;
  type: 'CREATE_PROJECT' | 'UPDATE_TODO' | 'UPLOAD_IMAGE' | 'DELETE_NODE' | 'MOVE_NODE';
  payload: any;
  timestamp: number;
  synced: boolean;
  retryCount: number;
  projectId?: string;
  pageId?: string;
}

export interface SWConfig {
  key: string;
  value: any;
  updatedAt: number;
}

// База данных Service Worker (отдельная от основной)
export class SWDatabase extends Dexie {
  cachedPages!: Table<CachedPage, string>;
  offlineActions!: Table<OfflineAction, string>;
  config!: Table<SWConfig, string>;
  syncQueue!: Table<any, string>;

  constructor() {
    super('LilPapperSW');
    
    this.version(1).stores({
      cachedPages: 'url, timestamp, projectId, pageId, [projectId+pageId]',
      offlineActions: 'id, type, timestamp, synced, retryCount, projectId, pageId',
      config: 'key, updatedAt',
      syncQueue: 'id, timestamp, entity, action'
    });
  }

  // Методы для работы со страницами
  async cachePage(url: string, html: string, projectId?: string, pageId?: string): Promise<void> {
    const page: CachedPage = {
      url,
      html,
      timestamp: Date.now(),
      projectId,
      pageId,
      metadata: {
        title: this.extractTitle(html),
        lastModified: Date.now()
      }
    };

    await this.cachedPages.put(page);
    
    // Очищаем старые страницы если их больше 50
    const count = await this.cachedPages.count();
    if (count > 50) {
      const oldestPages = await this.cachedPages
        .orderBy('timestamp')
        .limit(count - 50)
        .toArray();
      
      await this.cachedPages.bulkDelete(oldestPages.map(p => p.url));
    }
  }

  async getPage(url: string): Promise<CachedPage | undefined> {
    return await this.cachedPages.get(url);
  }

  async getProjectPages(projectId: string): Promise<CachedPage[]> {
    return await this.cachedPages
      .where('projectId')
      .equals(projectId)
      .toArray();
  }

  async deleteProjectPages(projectId: string): Promise<void> {
    await this.cachedPages
      .where('projectId')
      .equals(projectId)
      .delete();
  }

  // Методы для офлайн-действий
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced' | 'retryCount'>): Promise<void> {
    const fullAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0
    };

    await this.offlineActions.add(fullAction);
  }

  async getPendingActions(): Promise<OfflineAction[]> {
    return await this.offlineActions
      .where('synced')
      .equals(false)
      .toArray();
  }

  async markAsSynced(actionId: string): Promise<void> {
    await this.offlineActions.update(actionId, { synced: true });
  }

  async incrementRetry(actionId: string): Promise<void> {
    const action = await this.offlineActions.get(actionId);
    if (action) {
      await this.offlineActions.update(actionId, { 
        retryCount: action.retryCount + 1 
      });
    }
  }

  async cleanupOldActions(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = Date.now() - maxAge;
    await this.offlineActions
      .where('timestamp')
      .below(cutoff)
      .delete();
  }

  // Вспомогательные методы
  private extractTitle(html: string): string {
    const match = html.match(/<title>(.*?)<\/title>/i);
    return match ? match[1] : 'Lil Papper';
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.cachedPages.clear(),
      this.offlineActions.clear(),
      this.config.clear(),
      this.syncQueue.clear()
    ]);
  }
}

export const swDb = new SWDatabase();