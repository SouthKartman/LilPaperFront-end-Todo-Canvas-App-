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

export const useProjectImage = (imageId: string | null, retryCount: number = 0): UseProjectImageResult => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const urlRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout>();
  const maxAttempts = useRef(15); // Увеличиваем до 15 попыток
  const currentAttempt = useRef(0);

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
    currentAttempt.current = 0;

    try {
      console.log(`🔍 Загрузка изображения ${imageId}...`);

      // 1. Получаем метаданные изображения
      let image = await db.images.get(imageId);
      let imageAttempts = 0;
      
      // Ждем метаданные до 3 секунд
      while (!image && imageAttempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        image = await db.images.get(imageId);
        imageAttempts++;
      }
      
      if (!image) {
        throw new Error('Изображение не найдено в БД');
      }

      const pathMatch = image.filePath?.match(/\/images\/projects\/([^/]+)\/(.+)$/);
      if (!pathMatch) {
        throw new Error('Неверный формат пути');
      }

      const [, projectId, fileName] = pathMatch;
      const fileId = `${projectId}_${fileName}`;

      // 2. Проверяем наличие файла в fileStorage (до 5 секунд)
      let stored = await db.fileStorage.get(fileId);
      let fileAttempts = 0;
      
      while (!stored && fileAttempts < maxAttempts.current) {
        console.log(`⏳ Ожидание файла ${fileName} (${fileAttempts + 1}/${maxAttempts.current})...`);
        await new Promise(resolve => setTimeout(resolve, 300));
        stored = await db.fileStorage.get(fileId);
        fileAttempts++;
      }

      if (!stored) {
        throw new Error(`Файл ${fileName} не найден в хранилище после ${maxAttempts.current} попыток`);
      }

      cleanupUrl();
      const blobUrl = URL.createObjectURL(stored.blob);
      urlRef.current = blobUrl;
      
      setUrl(blobUrl);
      console.log(`✅ Изображение ${imageId} загружено (${fileAttempts * 300}ms)`);

    } catch (err) {
      console.error('❌ Ошибка загрузки:', err);
      setError(err instanceof Error ? err : new Error('Ошибка загрузки'));
      
      // Автоматический ретрай через 3 секунды
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setTimeout(() => {
          retry();
          pollIntervalRef.current = undefined;
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  }, [imageId, cleanupUrl, retryCount]);

  const retry = useCallback(() => {
    // Просто вызываем loadImage снова
    loadImage();
  }, [loadImage]);

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

  return { url, loading, error, retry };
};