// features/storage/lib/zipExportService.ts
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db } from '@shared/api/storage/indexedDB/schema';
import { RootState } from '@shared/lib/state/store';

export interface ExportProgress {
  status: 'idle' | 'exporting' | 'importing';
  progress: number;
  message: string;
  currentItem?: string;
}

export interface ExportOptions {
  projectName?: string;
  includeImages?: boolean;
  compressionLevel?: number;
  onProgress?: (progress: ExportProgress) => void;
}

export interface ImportResult {
  success: boolean;
  projectId?: string;
  projectName?: string;
  imagesRestored: number;
  errors: string[];
}

/**
 * Сервис для экспорта/импорта проектов в ZIP формат
 */
export class ZipExportService {
  
  /**
   * Экспорт проекта в ZIP архив
   */
  static async exportProject(
    todoNodes: Record<string, any>,
    imageNodes: Record<string, any>,
    project: RootState['project'],
    options: ExportOptions = {}
  ): Promise<Blob> {
    const {
      projectName = project.projects[project.currentProjectId || '']?.name || 'project',
      includeImages = true,
      compressionLevel = 6,
      onProgress
    } = options;
    
    const zip = new JSZip();
    let processedImages = 0;
    let failedImages = 0;
    
    // 1. Получаем файлы изображений из IndexedDB
    onProgress?.({
      status: 'exporting',
      progress: 5,
      message: 'Получение изображений из хранилища...',
    });
    
    const allFiles = await db.fileStorage.toArray();
    const imageFiles = includeImages 
      ? allFiles.filter(file => file.mimeType.startsWith('image/'))
      : [];
    
    // 2. Создаем папку для изображений
    const imagesFolder = zip.folder('images');
    
    // 3. Добавляем изображения в ZIP
    for (const file of imageFiles) {
      try {
        const extension = file.fileName.split('.').pop() || 'jpg';
        const safeFileName = `${file.projectId}_${file.fileName}`;
        
        imagesFolder?.file(safeFileName, file.blob);
        
        processedImages++;
        const progressPercent = 5 + (processedImages / imageFiles.length) * 70;
        
        onProgress?.({
          status: 'exporting',
          progress: progressPercent,
          message: `Добавление изображений: ${processedImages}/${imageFiles.length}`,
          currentItem: file.fileName,
        });
        
        // Даем браузеру подышать каждые 10 файлов
        if (processedImages % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      } catch (err) {
        console.error(`❌ Ошибка добавления ${file.fileName}:`, err);
        failedImages++;
      }
    }
    
    // 4. Собираем метаданные для экспорта
    onProgress?.({
      status: 'exporting',
      progress: 75,
      message: 'Сбор метаданных...',
    });
    
    const exportData = {
      version: '3.0',
      exportDate: new Date().toISOString(),
      hasImages: imageFiles.length > 0,
      imageCount: imageFiles.length,
      stats: {
        todoCount: Object.keys(todoNodes).length,
        imageCount: Object.keys(imageNodes).length,
        pageCount: Object.keys(project.pages || {}).length,
        projectName,
      },
      data: {
        todoNodes,
        imageNodes,
        project: {
          currentProjectId: project.currentProjectId,
          projects: project.projects || {},
          pages: project.pages || {},
          canvases: project.canvases || {},
        },
      },
      // Сохраняем информацию о файлах для восстановления
      fileManifest: imageFiles.map(file => ({
        projectId: file.projectId,
        fileName: file.fileName,
        originalName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
        // Находим связанный imageNode
        imageNodeId: Object.values(imageNodes).find(
          (node: any) => node.filePath?.includes(file.fileName)
        )?.id,
      })),
    };
    
    // 5. Добавляем JSON в ZIP
    zip.file('project.json', JSON.stringify(exportData, null, 2));
    
    onProgress?.({
      status: 'exporting',
      progress: 95,
      message: 'Создание архива...',
    });
    
    // 6. Генерируем ZIP
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: compressionLevel },
    });
    
    onProgress?.({
      status: 'idle',
      progress: 100,
      message: `✅ Экспорт завершен! Файлов: ${processedImages}, Ошибок: ${failedImages}`,
    });
    
    return zipBlob;
  }
  
  /**
   * Экспорт и сохранение проекта
   */
  static async exportAndSave(
    todoNodes: Record<string, any>,
    imageNodes: Record<string, any>,
    project: RootState['project'],
    options: ExportOptions = {}
  ): Promise<void> {
    const projectName = options.projectName || 
      project.projects[project.currentProjectId || '']?.name || 'project';
    const dateStr = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `${projectName}_export_${dateStr}.canvas`;
    
    const zipBlob = await this.exportProject(todoNodes, imageNodes, project, options);
    saveAs(zipBlob, fileName);
  }
  
  /**
   * Импорт проекта из ZIP архива
   */
  static async importProject(
    file: File,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imagesRestored: 0,
      errors: [],
    };
    
    try {
      onProgress?.({
        status: 'importing',
        progress: 0,
        message: 'Чтение архива...',
      });
      
      const zip = await JSZip.loadAsync(file);
      
      // 1. Читаем метаданные
      const projectFile = zip.file('project.json');
      if (!projectFile) {
        throw new Error('Неверный формат проекта. Файл project.json не найден.');
      }
      
      const projectData = JSON.parse(await projectFile.async('string'));
      onProgress?.({
        status: 'importing',
        progress: 10,
        message: 'Метаданные загружены',
      });
      
      // 2. Создаем новый проект
      const newProjectId = `proj_${Date.now()}`;
      const currentProjectName = projectData.data?.project?.projects?.[projectData.data.project.currentProjectId]?.name ||
        projectData.project?.name ||
        projectData.stats?.projectName ||
        'Импортированный проект';
      
      // 3. Восстанавливаем изображения из папки images
      const imagesFolder = zip.folder('images');
      const restoredImages = new Map<string, { projectId: string; fileName: string; blob: Blob }>();
      const totalImages = projectData.data?.imageNodes ? Object.keys(projectData.data.imageNodes).length : 0;
      
      if (imagesFolder && totalImages > 0) {
        const imageFiles = Object.values(imagesFolder.files).filter(f => !f.dir);
        let restoredCount = 0;
        
        for (const imageFile of imageFiles) {
          try {
            const blob = await imageFile.async('blob');
            const fileName = imageFile.name;
            
            // Извлекаем projectId из имени файла
            const match = fileName.match(/^([^_]+)_(.+)$/);
            const originalProjectId = match ? match[1] : 'default';
            const originalFileName = match ? match[2] : fileName;
            
            // Сохраняем файл в IndexedDB
            const fileObj = new File([blob], originalFileName, { type: blob.type });
            
            await db.saveFile(
              fileObj,
              newProjectId,
              originalFileName,
              undefined,
              undefined
            );
            
            // Запоминаем соответствие
            const fileKey = `${originalProjectId}_${originalFileName}`;
            restoredImages.set(fileKey, {
              projectId: newProjectId,
              fileName: originalFileName,
              blob,
            });
            
            restoredCount++;
            const progressPercent = 10 + (restoredCount / totalImages) * 60;
            
            onProgress?.({
              status: 'importing',
              progress: progressPercent,
              message: `Восстановление изображений: ${restoredCount}/${totalImages}`,
              currentItem: originalFileName,
            });
            
            if (restoredCount % 10 === 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка';
            result.errors.push(`Ошибка восстановления ${imageFile.name}: ${errorMsg}`);
            console.error('❌ Ошибка восстановления файла:', err);
          }
        }
        
        result.imagesRestored = restoredCount;
      }
      
      // 4. Обновляем imageNodes с новыми путями
      onProgress?.({
        status: 'importing',
        progress: 70,
        message: 'Обновление метаданных...',
      });
      
      const updatedImageNodes: Record<string, any> = {};
      
      for (const [id, imageNode] of Object.entries(projectData.data?.imageNodes || {})) {
        const oldFilePath = (imageNode as any).filePath;
        const match = oldFilePath?.match(/\/images\/projects\/([^/]+)\/(.+)$/);
        
        if (match) {
          const [, oldProjectId, fileName] = match;
          const fileKey = `${oldProjectId}_${fileName}`;
          const restored = restoredImages.get(fileKey);
          
          if (restored) {
            updatedImageNodes[id] = {
              ...imageNode,
              filePath: `/images/projects/${newProjectId}/${fileName}`,
              projectId: newProjectId,
              updatedAt: new Date().toISOString(),
            };
          } else {
            updatedImageNodes[id] = imageNode;
          }
        } else {
          updatedImageNodes[id] = imageNode;
        }
      }
      
      // 5. Обновляем todoNodes и project данные
      const updatedTodoNodes = { ...(projectData.data?.todoNodes || {}) };
      const updatedProject = {
        ...(projectData.data?.project || {}),
        currentProjectId: newProjectId,
        projects: {
          [newProjectId]: {
            id: newProjectId,
            name: currentProjectName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...(projectData.data?.project?.projects || {}),
        },
      };
      
      onProgress?.({
        status: 'importing',
        progress: 85,
        message: 'Сохранение в IndexedDB...',
      });
      
      // 6. Сохраняем в IndexedDB
      await db.todos.bulkPut(
        Object.values(updatedTodoNodes).map(todo => ({
          ...todo,
          projectId: newProjectId,
          updatedAt: new Date().toISOString(),
        }))
      );
      
      await db.images.bulkPut(
        Object.values(updatedImageNodes).map(image => ({
          ...image,
          projectId: newProjectId,
          updatedAt: new Date().toISOString(),
        }))
      );
      
      await db.projects.put({
        id: newProjectId,
        name: currentProjectName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      result.success = true;
      result.projectId = newProjectId;
      result.projectName = currentProjectName;
      
      onProgress?.({
        status: 'idle',
        progress: 100,
        message: `✅ Импорт завершен! Восстановлено: ${result.imagesRestored} изображений`,
      });
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка';
      result.errors.push(errorMsg);
      result.success = false;
      
      onProgress?.({
        status: 'idle',
        progress: 0,
        message: `❌ Ошибка: ${errorMsg}`,
      });
    }
    
    return result;
  }
  
  /**
   * Проверка файла на валидность
   */
  static async validateProjectFile(file: File): Promise<{
    isValid: boolean;
    version?: string;
    imageCount?: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    if (!file.name.endsWith('.canvas')) {
      errors.push('Неверное расширение файла. Ожидается .canvas');
      return { isValid: false, errors };
    }
    
    try {
      const zip = await JSZip.loadAsync(file);
      const projectFile = zip.file('project.json');
      
      if (!projectFile) {
        errors.push('project.json не найден в архиве');
        return { isValid: false, errors };
      }
      
      const projectData = JSON.parse(await projectFile.async('string'));
      
      if (projectData.version !== '3.0') {
        errors.push(`Версия формата ${projectData.version} может быть несовместима`);
      }
      
      return {
        isValid: true,
        version: projectData.version,
        imageCount: projectData.imageCount || 0,
        errors,
      };
      
    } catch (error) {
      errors.push('Не удалось прочитать файл. Возможно, файл поврежден.');
      return { isValid: false, errors };
    }
  }
}

// Хук для удобного использования
export const useZipExport = () => {
  const [progress, setProgress] = useState<ExportProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const exportProject = useCallback(async (
    todoNodes: Record<string, any>,
    imageNodes: Record<string, any>,
    project: RootState['project'],
    options?: ExportOptions
  ) => {
    setIsLoading(true);
    try {
      await ZipExportService.exportAndSave(todoNodes, imageNodes, project, {
        ...options,
        onProgress: setProgress,
      });
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      return false;
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setProgress({ status: 'idle', progress: 0, message: '' });
      }, 3000);
    }
  }, []);
  
  const importProject = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const result = await ZipExportService.importProject(file, setProgress);
      return result;
    } catch (error) {
      console.error('Import failed:', error);
      return { success: false, imagesRestored: 0, errors: ['Import failed'] };
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setProgress({ status: 'idle', progress: 0, message: '' });
      }, 3000);
    }
  }, []);
  
  const validateFile = useCallback(async (file: File) => {
    return await ZipExportService.validateProjectFile(file);
  }, []);
  
  return {
    exportProject,
    importProject,
    validateFile,
    progress,
    isLoading,
  };
};

import { useState, useCallback } from 'react';