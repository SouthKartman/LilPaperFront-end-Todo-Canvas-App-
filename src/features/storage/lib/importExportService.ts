// features/storage/lib/importExportService.ts
import { db } from '@shared/api/storage/indexedDB/schema';
import { ZipService } from '@shared/lib/archive/zipService';

export interface PageExportData {
  version: string;
  exportType: 'page' | 'nodes';
  exportDate: string;
  projectId: string;
  pageId?: string;
  pageName?: string;
  nodes: any[];
  images: Array<{
    id: string;
    fileName: string;
    blob: Blob;
  }>;
}

export interface ImportResult {
  success: boolean;
  importedNodes: number;
  importedImages: number;
  errors: string[];
}

export class PageImportExportService {
  
  /**
   * Экспорт страницы или выделенных нод в ZIP
   */
  static async exportNodes(
    nodes: any[],
    projectId: string,
    projectName: string,
    pageId?: string,
    pageName?: string,
    onProgress?: (percent: number, message: string) => void
  ): Promise<Blob> {
    onProgress?.(0, 'Подготовка данных...');
    
    // 1. Собираем изображения, связанные с нодами
    const imageNodes = nodes.filter(node => node.type === 'image');
    const imagesToExport: Array<{ id: string; fileName: string; blob: Blob }> = [];
    
    onProgress?.(10, `Поиск изображений (${imageNodes.length} нод)...`);
    
    for (const imageNode of imageNodes) {
      try {
        const filePath = imageNode.filePath;
        const match = filePath?.match(/\/images\/projects\/([^/]+)\/(.+)$/);
        
        if (match) {
          const [, fileProjectId, fileName] = match;
          const file = await db.getFile(fileProjectId, fileName);
          
          if (file) {
            imagesToExport.push({
              id: imageNode.id,
              fileName: fileName,
              blob: file,
            });
          }
        }
      } catch (err) {
        console.error('Ошибка получения изображения:', err);
      }
    }
    
    // 2. Создаем экспортные данные
    onProgress?.(20, 'Создание манифеста...');
    
    const exportData: PageExportData = {
      version: '3.0',
      exportType: pageId ? 'page' : 'nodes',
      exportDate: new Date().toISOString(),
      projectId,
      pageId,
      pageName: pageName || 'Экспортированные ноды',
      nodes: nodes.map(node => ({
        ...node,
        // Очищаем временные данные
        _tempData: undefined,
      })),
      images: [],
    };
    
    // 3. Создаем ZIP архив
    const zipFiles = [
      { path: 'manifest.json', data: JSON.stringify(exportData, null, 2) }
    ];
    
    // 4. Добавляем изображения
    onProgress?.(30, `Добавление изображений (${imagesToExport.length})...`);
    
    for (let i = 0; i < imagesToExport.length; i++) {
      const image = imagesToExport[i];
      zipFiles.push({
        path: `images/${image.id}_${image.fileName}`,
        data: image.blob,
      });
      
      const percent = 30 + (i / imagesToExport.length) * 60;
      onProgress?.(percent, `Изображения: ${i + 1}/${imagesToExport.length}`);
      
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    onProgress?.(90, 'Создание архива...');
    
    const blob = await ZipService.createArchive(zipFiles);
    
    onProgress?.(100, 'Готово!');
    
    return blob;
  }
  
  /**
   * Импорт страницы или нод в текущий проект
   */
  static async importNodes(
    file: File,
    targetProjectId: string,
    targetPageId: string,
    onProgress?: (percent: number, message: string) => void
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      importedNodes: 0,
      importedImages: 0,
      errors: [],
    };
    
    onProgress?.(0, 'Чтение архива...');
    
    try {
      const zip = await ZipService.readArchive(file);
      
      // 1. Читаем манифест
      const manifestContent = await ZipService.getFileContent(zip, 'manifest.json');
      if (!manifestContent) {
        throw new Error('manifest.json не найден');
      }
      
      const manifest: PageExportData = JSON.parse(manifestContent);
      onProgress?.(10, 'Манифест загружен');
      
      // 2. Восстанавливаем изображения
      const imagesFolder = zip.folder('images');
      const restoredImages = new Map<string, string>(); // oldId -> newPath
      
      if (imagesFolder) {
        const imageFiles = Object.values(imagesFolder.files).filter(f => !f.dir);
        
        for (let i = 0; i < imageFiles.length; i++) {
          const imageFile = imageFiles[i];
          try {
            const blob = await imageFile.async('blob');
            const fileName = imageFile.name;
            const match = fileName.match(/^([^_]+)_(.+)$/);
            const imageId = match ? match[1] : `img_${Date.now()}_${i}`;
            const originalFileName = match ? match[2] : fileName;
            
            // Сохраняем файл
            const fileObj = new File([blob], originalFileName, { type: blob.type });
            await db.saveFile(fileObj, targetProjectId, originalFileName, undefined, undefined);
            
            // Сохраняем соответствие
            restoredImages.set(imageId, `/images/projects/${targetProjectId}/${originalFileName}`);
            result.importedImages++;
            
            const percent = 10 + (i / imageFiles.length) * 40;
            onProgress?.(percent, `Восстановление изображений: ${i + 1}/${imageFiles.length}`);
          } catch (err) {
            result.errors.push(`Ошибка восстановления ${imageFile.name}: ${err}`);
          }
        }
      }
      
      // 3. Обновляем ноды с новыми путями изображений
      onProgress?.(50, 'Обновление метаданных...');
      
      const importedNodes = manifest.nodes.map(node => {
        if (node.type === 'image') {
          const oldFilePath = node.filePath;
          const match = oldFilePath?.match(/\/images\/projects\/([^/]+)\/(.+)$/);
          if (match) {
            const [, , fileName] = match;
            // Находим восстановленное изображение по имени файла
            for (const [oldId, newPath] of restoredImages) {
              if (newPath.includes(fileName)) {
                return {
                  ...node,
                  id: `${Date.now()}_${node.id}`, // Генерируем новый ID
                  filePath: newPath,
                  projectId: targetProjectId,
                  pageId: targetPageId,
                  updatedAt: new Date().toISOString(),
                };
              }
            }
          }
        }
        
        return {
          ...node,
          id: `${Date.now()}_${node.id}`,
          projectId: targetProjectId,
          pageId: targetPageId,
          updatedAt: new Date().toISOString(),
        };
      });
      
      result.importedNodes = importedNodes.length;
      
      // 4. Сохраняем ноды в базу данных
      onProgress?.(80, `Сохранение ${importedNodes.length} нод...`);
      
      const todosToSave = importedNodes.filter(n => n.type === 'todo');
      const imagesToSave = importedNodes.filter(n => n.type === 'image');
      
      if (todosToSave.length > 0) {
        await db.todos.bulkPut(todosToSave);
      }
      
      if (imagesToSave.length > 0) {
        await db.images.bulkPut(imagesToSave);
      }
      
      result.success = true;
      onProgress?.(100, 'Импорт завершен!');
      
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Неизвестная ошибка');
      onProgress?.(100, `Ошибка: ${result.errors[0]}`);
    }
    
    return result;
  }
}