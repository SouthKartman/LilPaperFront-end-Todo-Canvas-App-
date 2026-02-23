// src/features/image-upload/lib/useProjectImage.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@shared/api/storage/indexedDB/schema';
import { FileService } from '@shared/lib/dom/fileService';

interface UseProjectImageResult {
  url: string | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

export const useProjectImage = (imageId: string | null): UseProjectImageResult => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const urlRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  const cleanupUrl = useCallback(() => {
    if (urlRef.current && urlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const loadImage = useCallback(async () => {
    if (!imageId) {
      setUrl(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Загрузка изображения ${imageId}...`);

      // 1. Получаем метаданные изображения
      const image = await db.images.get(imageId);
      
      if (!image) {
        console.log(`⏳ Изображение ${imageId} еще не в БД`);
        throw new Error('Изображение не найдено в БД');
      }

      // 2. Извлекаем projectId и fileName из пути
      const pathMatch = image.filePath?.match(/\/images\/projects\/([^/]+)\/(.+)$/);
      if (!pathMatch) {
        throw new Error('Неверный формат пути');
      }

      const [, projectId, fileName] = pathMatch;
      const fileId = `${projectId}_${fileName}`;

      // 3. Проверяем наличие файла в fileStorage
      let stored = await db.fileStorage.get(fileId);
      
      // Если файла нет, ждем немного и пробуем снова (до 3 раз)
      let attempts = 0;
      while (!stored && attempts < 3) {
        console.log(`⏳ Ожидание записи файла ${fileName} (попытка ${attempts + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        stored = await db.fileStorage.get(fileId);
        attempts++;
      }

      if (!stored) {
        throw new Error(`Файл ${fileName} не найден в хранилище`);
      }

      // 4. Создаем URL из Blob
      cleanupUrl(); // Очищаем старый URL
      const blobUrl = URL.createObjectURL(stored.blob);
      urlRef.current = blobUrl;
      
      setUrl(blobUrl);
      console.log(`✅ Изображение ${imageId} загружено`);

    } catch (err) {
      console.error('❌ Ошибка загрузки:', err);
      setError(err instanceof Error ? err : new Error('Ошибка загрузки'));
      
      // Автоматический ретрай через 2 секунды
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          pollIntervalRef.current = undefined;
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [imageId, cleanupUrl]);

  // Загружаем при изменении imageId или retryCount
  useEffect(() => {
    loadImage();

    return () => {
      if (pollIntervalRef.current) {
        clearTimeout(pollIntervalRef.current);
        pollIntervalRef.current = undefined;
      }
      cleanupUrl();
    };
  }, [imageId, retryCount, loadImage, cleanupUrl]);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  return { url, loading, error, retry };
};