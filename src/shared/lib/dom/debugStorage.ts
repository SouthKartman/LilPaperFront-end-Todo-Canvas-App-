// src/shared/utils/debugStorage.ts
import { db } from '@shared/api/storage/indexedDB/schema';

export async function debugImageStorage() {
  console.group('🔍 Диагностика хранилища изображений');
  
  // Проверяем метаданные изображений
  const images = await db.images.toArray();
  console.log(`📸 Всего изображений в БД: ${images.length}`);
  
  // Проверяем физические файлы
  const files = await db.fileStorage.toArray();
  console.log(`💾 Всего файлов в хранилище: ${files.length}`);
  
  // Ищем рассинхронизацию
  const imagePaths = images.map(img => {
    const match = img.filePath?.match(/\/images\/projects\/([^/]+)\/(.+)$/);
    return match ? `${match[1]}_${match[2]}` : null;
  }).filter(Boolean);
  
  const fileIds = files.map(f => f.id);
  
  const missingFiles = imagePaths.filter(path => path && !fileIds.includes(path));
  
  if (missingFiles.length > 0) {
    console.warn('⚠️ Отсутствуют файлы для изображений:', missingFiles);
  } else {
    console.log('✅ Все файлы на месте');
  }
  
  console.groupEnd();
  
  return { images, files, missingFiles };
}

// Добавьте в консоль для отладки
(window as any).debugImages = debugImageStorage;