// features/project-management/lib/projectsBatchExport.ts
import JSZip from 'jszip';
import { db } from '@shared/api/storage/indexedDB/schema';

export interface BatchExportData {
  version: string;
  exportType: 'projects_batch';
  exportDate: string;
  projects: any[];
  stats: {
    totalProjects: number;
    totalPages: number;
    totalTodos: number;
    totalImages: number;
    totalSize: number;
  };
}

export class ProjectsBatchExportService {
  
  /**
   * Экспорт всех проектов с изображениями в один ZIP архив
   */
  static async exportAllProjects(
    projects: any[],
    onProgress?: (percent: number, message: string) => void
  ): Promise<Blob> {
    const zip = new JSZip();
    const projectsFolder = zip.folder('projects');
    const imagesFolder = zip.folder('images');
    
    let totalSize = 0;
    let totalPages = 0;
    let totalTodos = 0;
    let totalImages = 0;
    
    const projectsExportData: any[] = [];
    
    onProgress?.(0, `Подготовка к экспорту ${projects.length} проектов...`);
    
    // Обрабатываем каждый проект
    for (let pIndex = 0; pIndex < projects.length; pIndex++) {
      const project = projects[pIndex];
      const projectProgress = (pIndex / projects.length) * 100;
      onProgress?.(projectProgress, `Обработка проекта: ${project.name}`);
      
      // Получаем данные проекта из IndexedDB
      const [pages, todos, images] = await Promise.all([
        db.pages.where('projectId').equals(project.id).toArray(),
        db.todos.where('projectId').equals(project.id).toArray(),
        db.images.where('projectId').equals(project.id).toArray(),
      ]);
      
      totalPages += pages.length;
      totalTodos += todos.length;
      totalImages += images.length;
      
      // Собираем изображения для этого проекта
      const projectImages: any[] = [];
      
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const filePath = image.filePath;
        const match = filePath?.match(/\/images\/projects\/([^/]+)\/(.+)$/);
        
        if (match) {
          const [, projectId, fileName] = match;
          const fileBlob = await db.getFile(projectId, fileName);
          
          if (fileBlob) {
            totalSize += fileBlob.size;
            
            // Сохраняем изображение в общую папку с уникальным именем
            const uniqueFileName = `${project.id}_${fileName}`;
            imagesFolder?.file(uniqueFileName, fileBlob);
            
            projectImages.push({
              id: image.id,
              originalPath: filePath,
              archivedPath: `images/${uniqueFileName}`,
              fileName: fileName,
              size: fileBlob.size,
            });
          }
        }
      }
      
      // Сохраняем данные проекта
      projectsExportData.push({
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          metadata: project.metadata,
        },
        pages: pages.map(page => ({
          ...page,
          _tempData: undefined,
        })),
        todos: todos.map(todo => ({
          ...todo,
          _tempData: undefined,
        })),
        images: images.map(image => ({
          ...image,
          _tempData: undefined,
        })),
        imagesManifest: projectImages,
      });
      
      // Даем браузеру подышать
      if (pIndex % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    // Создаем общий манифест
    const manifest: BatchExportData = {
      version: '3.0',
      exportType: 'projects_batch',
      exportDate: new Date().toISOString(),
      projects: projectsExportData,
      stats: {
        totalProjects: projects.length,
        totalPages,
        totalTodos,
        totalImages,
        totalSize,
      },
    };
    
    // Добавляем манифест в корень ZIP
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    
    onProgress?.(90, 'Создание архива...');
    
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    
    onProgress?.(100, 'Готово!');
    
    return zipBlob;
  }
  
  /**
   * Импорт проектов из ZIP архива
   */
  static async importProjects(
    file: File,
    onProgress?: (percent: number, message: string) => void
  ): Promise<{
    success: boolean;
    importedProjects: number;
    importedPages: number;
    importedTodos: number;
    importedImages: number;
    errors: string[];
  }> {
    const result = {
      success: false,
      importedProjects: 0,
      importedPages: 0,
      importedTodos: 0,
      importedImages: 0,
      errors: [] as string[],
    };
    
    onProgress?.(0, 'Чтение архива...');
    
    try {
      const zip = await JSZip.loadAsync(file);
      
      // 1. Читаем манифест
      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) {
        throw new Error('manifest.json не найден в архиве');
      }
      
      const manifest: BatchExportData = JSON.parse(await manifestFile.async('string'));
      onProgress?.(10, `Найдено проектов: ${manifest.projects.length}`);
      
      // 2. Получаем папку с изображениями
      const imagesFolder = zip.folder('images');
      const now = new Date().toISOString();
      
      // 3. Восстанавливаем каждый проект
      for (let i = 0; i < manifest.projects.length; i++) {
        const projectData = manifest.projects[i];
        const projectProgress = 10 + (i / manifest.projects.length) * 80;
        onProgress?.(projectProgress, `Восстановление проекта: ${projectData.project.name}`);
        
        const newProjectId = `proj_${Date.now()}_${i}`;
        
        // Создаем новый проект
        await db.projects.put({
          ...projectData.project,
          id: newProjectId,
          name: `${projectData.project.name}_${new Date().toISOString().slice(0, 10)}`,
          createdAt: now,
          updatedAt: now,
          metadata: {
            ...projectData.project.metadata,
            updatedAt: now,
            createdAt: projectData.project.createdAt || now,
          },
          pageIds: [],
          archived: false,
        });
        
        result.importedProjects++;
        
        // Восстанавливаем страницы
        const pageIdMap = new Map<string, string>();
        
        for (let pIdx = 0; pIdx < projectData.pages.length; pIdx++) {
          const oldPage = projectData.pages[pIdx];
          const newPageId = `${newProjectId}_page_${Date.now()}_${pIdx}`;
          pageIdMap.set(oldPage.id, newPageId);
          
          await db.pages.put({
            ...oldPage,
            id: newPageId,
            projectId: newProjectId,
            createdAt: now,
            updatedAt: now,
          });
          
          result.importedPages++;
        }
        
        // Восстанавливаем изображения (файлы)
        const imagePathMap = new Map<string, string>();
        
        for (const imageManifest of projectData.imagesManifest) {
          try {
            const imageFile = imagesFolder?.file(imageManifest.archivedPath.replace('images/', ''));
            if (imageFile) {
              const blob = await imageFile.async('blob');
              const fileName = imageManifest.fileName;
              
              await db.saveFile(
                new File([blob], fileName, { type: blob.type }),
                newProjectId,
                fileName,
                undefined,
                undefined
              );
              
              const newPath = `/images/projects/${newProjectId}/${fileName}`;
              imagePathMap.set(imageManifest.originalPath, newPath);
              result.importedImages++;
            }
          } catch (err) {
            result.errors.push(`Ошибка восстановления изображения ${imageManifest.fileName}: ${err}`);
          }
        }
        
        // Восстанавливаем задачи (todos)
        const updatedTodos = projectData.todos.map((todo: any) => {
          const newPageId = pageIdMap.get(todo.pageId) || todo.pageId;
          return {
            ...todo,
            id: `${Date.now()}_${todo.id}`,
            projectId: newProjectId,
            pageId: newPageId,
            updatedAt: now,
          };
        });
        
        if (updatedTodos.length > 0) {
          await db.todos.bulkPut(updatedTodos);
          result.importedTodos += updatedTodos.length;
        }
        
        // Восстанавливаем изображения-ноды
        const updatedImages = projectData.images.map((image: any) => {
          const newPageId = pageIdMap.get(image.pageId) || image.pageId;
          let newFilePath = image.filePath;
          
          for (const [oldPath, newPath] of imagePathMap) {
            if (newFilePath?.includes(oldPath)) {
              newFilePath = newFilePath.replace(oldPath, newPath);
              break;
            }
          }
          
          return {
            ...image,
            id: `${Date.now()}_${image.id}`,
            projectId: newProjectId,
            pageId: newPageId,
            filePath: newFilePath,
            updatedAt: now,
          };
        });
        
        if (updatedImages.length > 0) {
          await db.images.bulkPut(updatedImages);
        }
        
        // Даем браузеру подышать
        if (i % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
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