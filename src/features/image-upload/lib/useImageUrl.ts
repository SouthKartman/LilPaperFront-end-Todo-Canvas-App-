// src/features/image-upload/lib/useImageUrl.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { ImageIndexedDBStorage } from '@shared/api/storage/indexedDB/imageStorage';
import { db } from '@shared/api/storage/indexedDB/schema';

interface UseImageUrlResult {
  url: string | null;
  loading: boolean;
  error: Error | null;
  revoke: () => void;
  retry: () => void; // Добавляем функцию повторной попытки
}

export const useImageUrl = (imageId: string | null): UseImageUrlResult => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const urlRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const revoke = useCallback(() => {
    if (urlRef.current && urlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!imageId) {
      setUrl(null);
      return;
    }

    let isMounted = true;
    let currentUrl: string | null = null;

    const loadImage = async () => {
      // Очищаем предыдущий таймер
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setLoading(true);
      setError(null);
      
      try {
        console.log(`🖼️ Загрузка изображения: ${imageId} (попытка ${retryCount + 1})`);
        
        // Проверяем, есть ли метаданные в БД
        const image = await db.images.get(imageId);
        if (!image) {
          console.log(`⏳ Изображение ${imageId} еще не в БД, ждем...`);
          
          // Если метаданных нет, пробуем через секунду
          timeoutRef.current = setTimeout(() => {
            if (isMounted) {
              setRetryCount(prev => prev + 1);
            }
          }, 1000);
          
          setLoading(false);
          return;
        }

        // Получаем URL
        const imageUrl = await ImageIndexedDBStorage.getImageUrl(imageId);
        
        if (isMounted) {
          if (imageUrl) {
            // Освобождаем старый URL
            if (urlRef.current && urlRef.current.startsWith('blob:')) {
              URL.revokeObjectURL(urlRef.current);
            }
            
            currentUrl = imageUrl;
            urlRef.current = imageUrl;
            setUrl(imageUrl);
            console.log(`✅ Изображение загружено: ${imageId}`);
          } else {
            // Если файла нет, пробуем через секунду
            console.log(`⏳ Файл для ${imageId} еще не готов, ждем...`);
            timeoutRef.current = setTimeout(() => {
              if (isMounted) {
                setRetryCount(prev => prev + 1);
              }
            }, 1000);
            
            setError(new Error('Failed to load image'));
            setUrl('/placeholder-image.png');
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('❌ Ошибка загрузки:', err);
          setError(err instanceof Error ? err : new Error('Failed to load image'));
          setUrl('/placeholder-image.png');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (currentUrl && currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [imageId, retryCount]);

  return { url, loading, error, revoke, retry };
};