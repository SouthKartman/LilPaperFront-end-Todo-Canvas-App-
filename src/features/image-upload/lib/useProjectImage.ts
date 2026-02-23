// src/features/image-upload/lib/useProjectImage.ts
import { useState, useEffect } from 'react';
import { ImageIndexedDBStorage } from '@shared/api/storage/indexedDB/imageStorage';

interface UseProjectImageResult {
  url: string | null;
  loading: boolean;
  error: Error | null;
  revoke: () => void;
}

export const useProjectImage = (imageId: string | null): UseProjectImageResult => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!imageId) {
      setUrl(null);
      return;
    }

    let isMounted = true;
    let currentUrl: string | null = null;
    setLoading(true);

    const loadImage = async () => {
      try {
        const imageUrl = await ImageIndexedDBStorage.getImageUrl(imageId);
        
        if (isMounted) {
          setUrl(imageUrl);
          currentUrl = imageUrl;
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to load image'));
          setUrl('/placeholder-image.png'); // Fallback
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
      if (currentUrl && currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [imageId]);

  const revoke = () => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      setUrl(null);
    }
  };

  return { url, loading, error, revoke };
};