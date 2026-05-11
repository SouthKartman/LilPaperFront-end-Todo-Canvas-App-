// src/features/canvas-preview/lib/previewService.ts
import html2canvas from 'html2canvas';
import styles from '@widgets/canvas-workspace/ui/CanvasWorkspace.module.css';

export interface ProjectPreview {
  projectId: string;
  preview: string;
  generatedAt: string;
  version: number;
}

class PreviewService {
  private static instance: PreviewService;
  private previewCache: Map<string, { preview: string; timestamp: number }> = new Map();
  private generationQueue: Set<string> = new Set();
  private generationAttempts: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 * 30; // 7 * 30 дней в миллисекундах
  private readonly PREVIEW_WIDTH = 800;
  private readonly PREVIEW_HEIGHT = 400;
  private readonly STORAGE_KEY = 'canvas_previews';
  private readonly MIN_SIZE = 50;

  private constructor() {
    console.log('📸 PreviewService инициализирован (localStorage)');
    this.loadFromStorage();
  }

  static getInstance(): PreviewService {
    if (!PreviewService.instance) {
      PreviewService.instance = new PreviewService();
    }
    return PreviewService.instance;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const previews = JSON.parse(stored);
        Object.entries(previews).forEach(([projectId, data]: [string, any]) => {
          this.previewCache.set(projectId, {
            preview: data.preview,
            timestamp: data.timestamp
          });
        });
        console.log(`📦 Загружено ${this.previewCache.size} превью из localStorage`);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки превью из localStorage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const previews: Record<string, any> = {};
      this.previewCache.forEach((value, key) => {
        previews[key] = value;
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(previews));
    } catch (error) {
      console.error('❌ Ошибка сохранения превью в localStorage:', error);
    }
  }

  /**
   * УПРОЩЕННЫЙ поиск canvas элемента
   */
  private findCanvasElement(projectId: string): Element | null {
    console.log('🔍 Поиск элемента для проекта:', projectId);
    
    // Приоритет 1: Прямой canvas элемент
    const canvasEl = document.querySelector(`[data-project-id="${projectId}"] canvas`);
    if (canvasEl) {
      console.log('✅ Найден прямой canvas');
      return canvasEl;
    }
    
    // Приоритет 2: Контейнер с контентом
    const contentEl = document.querySelector(`[data-project-id="${projectId}"] .${styles.content}`);
    if (contentEl) {
      console.log('✅ Найден content контейнер');
      return contentEl;
    }
    
    // Приоритет 3: Любой элемент с data-project-id
    const projectEl = document.querySelector(`[data-project-id="${projectId}"]`);
    if (projectEl) {
      console.log('✅ Найден project контейнер');
      return projectEl;
    }
    
    console.log('❌ Элемент не найден');
    return null;
  }

  /**
   * Ожидание появления элемента (упрощенное)
   */
  private async waitForElement(projectId: string, maxAttempts = 3): Promise<Element | null> {
    for (let i = 0; i < maxAttempts; i++) {
      const element = this.findCanvasElement(projectId);
      
      if (element) {
        const rect = element.getBoundingClientRect();
        console.log(`📏 Попытка ${i + 1}: размеры = ${rect.width}x${rect.height}`);
        
        // Если есть ненулевые размеры - возвращаем
        if (rect.width > 0 && rect.height > 0) {
          return element;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Возвращаем что нашли (даже с нулевыми размерами)
    return this.findCanvasElement(projectId);
  }

  /**
   * Конвертация Blob в DataURL
   */
  private blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Съемка напрямую с canvas элемента
   */
  private async captureFromCanvas(canvas: HTMLCanvasElement, projectId: string): Promise<string> {
    console.log('🎨 Съемка напрямую с canvas');
    
    const canvasWidth = canvas.width || canvas.clientWidth || 800;
    const canvasHeight = canvas.height || canvas.clientHeight || 400;

    const offscreenCanvas = new OffscreenCanvas(this.PREVIEW_WIDTH, this.PREVIEW_HEIGHT);
    const ctx = offscreenCanvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get 2d context');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    try {
      ctx.drawImage(
        canvas,
        0, 0,
        canvasWidth, canvasHeight,
        0, 0,
        this.PREVIEW_WIDTH, this.PREVIEW_HEIGHT
      );
    } catch (error) {
      console.warn('⚠️ Ошибка при рисовании canvas');
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, this.PREVIEW_WIDTH, this.PREVIEW_HEIGHT);
    }

    const blob = await offscreenCanvas.convertToBlob({
      type: 'image/jpeg',
      quality: 0.7
    });

    const previewUrl = await this.blobToDataURL(blob);
    
    // 📊 ПОКАЗЫВАЕМ РАЗМЕР ПРЕВЬЮ
    const sizeInKB = Math.round(previewUrl.length / 1024);
    console.log(`📊 Размер превью: ${sizeInKB} KB`);
    
    this.previewCache.set(projectId, {
      preview: previewUrl,
      timestamp: Date.now()
    });

    return previewUrl;
  }

  /**
   * Съемка с DOM элемента
   */
  private async captureFromDOM(element: HTMLElement, projectId: string): Promise<string> {
    console.log('🖼️ Съемка с DOM элемента');
    
    const originalStyles = {
      display: element.style.display,
      visibility: element.style.visibility,
      opacity: element.style.opacity,
      width: element.style.width,
      height: element.style.height,
    };

    try {
      // Делаем элемент видимым
      element.style.display = 'block';
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      
      const rect = element.getBoundingClientRect();
      if (rect.width < this.MIN_SIZE || rect.height < this.MIN_SIZE) {
        element.style.width = '800px';
        element.style.height = '400px';
      }

      await new Promise(resolve => setTimeout(resolve, 50));

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        allowTaint: true,
        useCORS: true,
        logging: false,
        width: 800,
        height: 400,
      });

      if (canvas.width === 0 || canvas.height === 0) {
        return this.createManualPreview(projectId);
      }

      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = this.PREVIEW_WIDTH;
      previewCanvas.height = this.PREVIEW_HEIGHT;
      
      const ctx = previewCanvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get context');

      ctx.drawImage(
        canvas,
        0, 0,
        canvas.width, canvas.height,
        0, 0,
        this.PREVIEW_WIDTH, this.PREVIEW_HEIGHT
      );

      const previewUrl = previewCanvas.toDataURL('image/jpeg', 0.7);
      
      // 📊 ПОКАЗЫВАЕМ РАЗМЕР ПРЕВЬЮ
      const sizeInKB = Math.round(previewUrl.length / 1024);
      console.log(`📊 Размер превью: ${sizeInKB} KB`);
      
      this.previewCache.set(projectId, {
        preview: previewUrl,
        timestamp: Date.now()
      });

      return previewUrl;

    } finally {
      // Восстанавливаем стили
      element.style.display = originalStyles.display;
      element.style.visibility = originalStyles.visibility;
      element.style.opacity = originalStyles.opacity;
      element.style.width = originalStyles.width;
      element.style.height = originalStyles.height;
    }
  }

  /**
   * Ручное создание превью
   */
  private createManualPreview(projectId: string): string {
    console.log('🎨 Создаем ручное превью');
    
    const canvas = document.createElement('canvas');
    canvas.width = this.PREVIEW_WIDTH;
    canvas.height = this.PREVIEW_HEIGHT;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No context');
    
    // Градиентный фон
    const gradient = ctx.createLinearGradient(0, 0, this.PREVIEW_WIDTH, this.PREVIEW_HEIGHT);
    gradient.addColorStop(0, '#f8f9fa');
    gradient.addColorStop(1, '#e9ecef');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.PREVIEW_WIDTH, this.PREVIEW_HEIGHT);
    
    // Рамка
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, this.PREVIEW_WIDTH - 20, this.PREVIEW_HEIGHT - 20);
    
    // Текст
    ctx.fillStyle = '#495057';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📋', this.PREVIEW_WIDTH / 2, this.PREVIEW_HEIGHT / 2 - 20);
    
    ctx.font = '16px Arial';
    ctx.fillStyle = '#6c757d';
    ctx.fillText('Проект', this.PREVIEW_WIDTH / 2, this.PREVIEW_HEIGHT / 2 + 20);
    
    const previewUrl = canvas.toDataURL('image/jpeg', 0.7);
    
    // 📊 ПОКАЗЫВАЕМ РАЗМЕР ПРЕВЬЮ
    const sizeInKB = Math.round(previewUrl.length / 1024);
    console.log(`📊 Размер ручного превью: ${sizeInKB} KB`);
    
    this.previewCache.set(projectId, {
      preview: previewUrl,
      timestamp: Date.now()
    });
    
    return previewUrl;
  }

  /**
   * Получение состояния viewport
   */
  private getViewportState(projectId: string): { x: number; y: number; scale: number } | null {
    try {
      // @ts-ignore
      const state = window.__REDUX_STORE__?.getState();
      return state?.canvasViewport?.[projectId] || null;
    } catch {
      return null;
    }
  }

  /**
   * Генерация превью проекта
   */
  async generateProjectPreview(projectId: string): Promise<string | null> {
    if (this.generationQueue.has(projectId)) {
      console.log('⏳ Уже генерируется');
      return null;
    }

    const lastGen = this.generationAttempts.get(projectId) || 0;
    const now = Date.now();
    if (lastGen && now - lastGen < 5000) {
      console.log('⏳ Throttling');
      return null;
    }

    this.generationQueue.add(projectId);
    this.generationAttempts.set(projectId, now);

    try {
      console.log(`📸 Генерация для проекта: ${projectId}`);

      // Пробуем найти canvas
      const canvasEl = document.querySelector(`[data-project-id="${projectId}"] canvas`);
      if (canvasEl instanceof HTMLCanvasElement) {
        try {
          return await this.captureFromCanvas(canvasEl, projectId);
        } catch (error) {
          console.warn('⚠️ Ошибка canvas:', error);
        }
      }

      // Пробуем DOM элемент
      const domElement = await this.waitForElement(projectId);
      if (domElement) {
        try {
          return await this.captureFromDOM(domElement as HTMLElement, projectId);
        } catch (error) {
          console.warn('⚠️ Ошибка DOM:', error);
        }
      }

      // Ручное превью как последний шанс
      return this.createManualPreview(projectId);

    } catch (error) {
      console.error('❌ Ошибка:', error);
      return this.createManualPreview(projectId);
    } finally {
      this.generationQueue.delete(projectId);
    }
  }

  /**
   * Получение превью из кэша
   */
  async getProjectPreview(projectId: string): Promise<string | null> {
    const cached = this.previewCache.get(projectId);
    if (cached) {
      if (Date.now() - cached.timestamp < this.CACHE_DURATION) {
        const sizeInKB = Math.round(cached.preview.length / 1024);
        console.log(`📦 Preview from cache (${sizeInKB} KB)`);
        return cached.preview;
      } else {
        this.previewCache.delete(projectId);
        this.saveToStorage();
      }
    }
    return null;
  }

  /**
   * Принудительное обновление превью
   */
  async refreshPreview(projectId: string): Promise<string | null> {
    console.log('🔄 Refreshing preview');
    this.previewCache.delete(projectId);
    this.saveToStorage();
    return this.generateProjectPreview(projectId);
  }

  /**
   * Очистка устаревших превью
   */
  cleanCache(): void {
    const now = Date.now();
    let changed = false;
    
    for (const [id, data] of this.previewCache.entries()) {
      if (now - data.timestamp > this.CACHE_DURATION) {
        this.previewCache.delete(id);
        changed = true;
      }
    }
    
    if (changed) {
      this.saveToStorage();
      console.log('🧹 Old previews cleaned');
    }
  }

  /**
   * Получение статистики
   */
  getStats(): { size: number; totalSize: number } {
    let totalSize = 0;
    this.previewCache.forEach(data => {
      totalSize += data.preview.length;
    });
    
    const stats = {
      size: this.previewCache.size,
      totalSize: Math.round(totalSize / 1024)
    };
    
    console.log(`📊 Статистика: ${stats.size} превью, общий вес ${stats.totalSize} KB`);
    return stats;
  }

  /**
   * Удаление превью проекта
   */
  deletePreview(projectId: string): void {
    this.previewCache.delete(projectId);
    this.saveToStorage();
    console.log(`🗑️ Preview deleted`);
  }

  /**
   * Диагностика
   */
  public async diagnose(projectId: string): Promise<void> {
    console.group('🔍 ДИАГНОСТИКА');
    
    const element = this.findCanvasElement(projectId);
    console.log('Найденный элемент:', element);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      console.log('Размеры:', rect);
    }
    
    const stats = this.getStats();
    console.log('Статистика кэша:', stats);
    
    console.groupEnd();
  }
}

export const previewService = PreviewService.getInstance();