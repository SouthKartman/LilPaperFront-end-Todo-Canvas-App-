import { ProcessedImageData } from '@entities/image/model/types';
import { STORAGE_CONFIG } from '@shared/api/storage/storage';
import { FileService } from '@shared/lib/dom/fileService';

console.log('🚀 imageProcessor.ts загружается...', new Date().toISOString());

// ============= ОСНОВНЫЕ ФУНКЦИИ =============

export async function processAndSaveImage(
  file: File,
  projectId: string,
  position: { x: number; y: number }
): Promise<ProcessedImageData> {
  console.log('🔥 processAndSaveImage ВЫЗВАНА!', { file: file.name, projectId, position });
  
  try {
    // 1. Оптимизируем изображение
    const optimizedBlob = await optimizeImage(file);
    const optimizedFile = new File([optimizedBlob], file.name, { type: file.type });
    
    // 2. Сохраняем файл через FileService
    console.log('💾 Сохраняем файл через FileService...');
    const savedFile = await FileService.saveImage(optimizedFile, projectId);
    console.log('✅ Файл сохранен:', savedFile);
    
    // 3. Проверяем, что файл сохранился
    const { db } = await import('@shared/api/storage/indexedDB/schema');
    const pathMatch = savedFile.filePath.match(/\/images\/projects\/([^/]+)\/(.+)$/);
    
    if (pathMatch) {
      const [, , fileName] = pathMatch;
      const fileId = `${projectId}_${fileName}`;
      
      // Ждем запись в БД
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const stored = await db.fileStorage.get(fileId);
      if (stored) {
        console.log(`✅ Файл подтвержден в IndexedDB: ${fileName}`);
      } else {
        console.warn(`⚠️ Файл еще не в IndexedDB, но продолжим...`);
      }
    }
    
    // 4. Создаем запись для ноды
    const imageData: ProcessedImageData = {
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      filePath: savedFile.filePath,
      width: savedFile.width,
      height: savedFile.height,
      originalName: savedFile.originalName,
      fileSize: savedFile.fileSize,
      mimeType: savedFile.mimeType,
      position: position,
    };
    
    console.log('✅ Изображение обработано:', imageData.id);
    return imageData;
  } catch (error) {
    console.error('❌ Ошибка обработки изображения:', error);
    throw error;
  }
}

export async function processMultipleImages(
  files: File[],
  projectId: string,
  startPosition: { x: number; y: number },
  spacing: number = 250
): Promise<ProcessedImageData[]> {
  console.log('🔥 processMultipleImages ВЫЗВАНА!', { 
    filesCount: files.length, 
    projectId, 
    startPosition 
  });
  
  const results: ProcessedImageData[] = [];
  let offsetX = 0;

  for (const file of files) {
    try {
      const position = {
        x: startPosition.x + offsetX,
        y: startPosition.y,
      };
      
      console.log(`📸 Обрабатываю ${file.name}...`);
      
      const imageData = await processAndSaveImage(file, projectId, position);
      results.push(imageData);
      
      offsetX += spacing;
      console.log(`✅ ${file.name} обработан`);
    } catch (error) {
      console.error(`❌ Ошибка с ${file.name}:`, error);
    }
  }

  console.log(`🎉 Готово! Обработано ${results.length} изображений`);
  return results;
}

// ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============

export async function optimizeImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Не удалось создать контекст canvas'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Не удалось создать blob'));
          }
        },
        file.type,
        STORAGE_CONFIG.jpegQuality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось загрузить изображение'));
    };
    
    img.src = url;
  });
}

export function validateImage(file: File): { valid: boolean; error?: string } {
  console.log('🔍 validateImage:', file.name);
  
  if (file.size > STORAGE_CONFIG.maxFileSize) {
    return {
      valid: false,
      error: `Файл слишком большой. Максимальный размер: ${STORAGE_CONFIG.maxFileSize / 1024 / 1024}MB`
    };
  }
  
  if (!STORAGE_CONFIG.allowedTypes.includes(file.type as any)) {
    return {
      valid: false,
      error: `Неподдерживаемый тип файла: ${file.type}`
    };
  }
  
  return { valid: true };
}

export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height,
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось загрузить изображение'));
    };
    
    img.src = url;
  });
}

console.log('✅ imageProcessor.ts загружен!');