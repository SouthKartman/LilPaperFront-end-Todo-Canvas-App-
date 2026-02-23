// src/features/image-upload/lib/useImageUrl.ts
import { useState, useEffect, useCallback } from 'react';
import { ImageIndexedDBStorage } from '@shared/api/storage/indexedDB/imageStorage';

interface UseImageUrlResult {
  url: string | null;
  loading: boolean;
  error: Error | null;
  revoke: () => void;
}

export const useImageUrl = (imageId: string | null): UseImageUrlResult => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const revoke = useCallback(() => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      console.log('🧹 blob URL освобожден');
    }
  }, [url]);

  useEffect(() => {
    if (!imageId) {
      setUrl(null);
      return;
    }

    let isMounted = true;
    let currentUrl: string | null = null;

    const loadImage = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`🖼️ Загрузка изображения: ${imageId}`);
        
        // Получаем URL через ImageIndexedDBStorage
        const imageUrl = await ImageIndexedDBStorage.getImageUrl(imageId);
        
        if (isMounted) {
          if (imageUrl) {
            currentUrl = imageUrl;
            setUrl(imageUrl);
            console.log(`✅ Изображение загружено: ${imageId}`);
          } else {
            setError(new Error('Failed to load image'));
            setUrl('/placeholder-image.png'); // Fallback
            console.warn(`⚠️ Изображение не найдено: ${imageId}`);
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

    // Очистка при размонтировании
    return () => {
      isMounted = false;
      if (currentUrl && currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [imageId]);

  return { url, loading, error, revoke };
};