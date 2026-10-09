import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageIndexedDBStorage } from '@shared/api/storage/indexedDB/imageStorage';
import { db } from '@shared/api/storage/indexedDB/schema';

const MAX_LOAD_ATTEMPTS = 5;
const RETRY_DELAY_MS = 1000;

interface UseImageUrlResult {
  url: string | null;
  loading: boolean;
  error: Error | null;
  missing: boolean;
  revoke: () => void;
  retry: () => void;
  reportImageLoadError: () => void;
  markImageLoaded: () => void;
}

/**
 * Returns an IndexedDB object URL for an image.
 *
 * Metadata and file writes can complete at different moments. We check both
 * stores up to five times. Once all attempts fail, only the stale metadata is
 * removed; the physical file is deliberately left untouched.
 */
export const useImageUrl = (imageId: string | null): UseImageUrlResult => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [missing, setMissing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const urlRef = useRef<string | null>(null);
  const imageNameRef = useRef(imageId ?? 'изображение');
  const renderFailureCountRef = useRef(0);

  const revoke = useCallback(() => {
    if (urlRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(urlRef.current);
    }
    urlRef.current = null;
  }, []);

  const retry = useCallback(() => {
    renderFailureCountRef.current = 0;
    setAttempt(0);
    setRetryKey((value) => value + 1);
  }, []);

  const markMissing = useCallback(async (cause: Error) => {
    if (!imageId) return;

    // Do not call ImageIndexedDBStorage.deleteImage here: it removes the
    // physical file too. A failed lookup should only remove stale metadata.
    try {
      await db.images.delete(imageId);
    } catch (deleteCause) {
      console.error(`Не удалось удалить запись изображения ${imageId}:`, deleteCause);
    }

    setUrl(null);
    setError(cause);
    setMissing(true);
    setLoading(false);
    window.alert(`Картинка «${imageNameRef.current}» не найдена и была удалена из данных проекта.`);
  }, [imageId]);

  const reportImageLoadError = useCallback(() => {
    if (!imageId) return;

    renderFailureCountRef.current += 1;
    if (renderFailureCountRef.current >= MAX_LOAD_ATTEMPTS) {
      void markMissing(new Error('Браузер не смог отобразить изображение'));
      return;
    }

    revoke();
    setUrl(null);
    setLoading(true);
    setRetryKey((value) => value + 1);
  }, [imageId, markMissing, revoke]);

  const markImageLoaded = useCallback(() => {
    renderFailureCountRef.current = 0;
  }, []);

  useEffect(() => {
    if (!imageId) {
      revoke();
      setUrl(null);
      setLoading(false);
      setError(null);
      setMissing(false);
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const loadImage = async () => {
      setLoading(true);
      setError(null);
      setMissing(false);

      try {
        const image = await db.images.get(imageId);
        if (!image) {
          throw new Error('Метаданные изображения не найдены');
        }
        imageNameRef.current = image.originalName;

        const imageUrl = await ImageIndexedDBStorage.getImageUrl(imageId);
        if (!imageUrl) {
          throw new Error('Файл изображения не найден');
        }

        if (cancelled) return;

        revoke();
        urlRef.current = imageUrl;
        setUrl(imageUrl);
        setLoading(false);
      } catch (cause) {
        if (cancelled) return;

        const nextAttempt = attempt + 1;
        if (nextAttempt < MAX_LOAD_ATTEMPTS) {
          retryTimer = setTimeout(() => {
            if (!cancelled) {
              setAttempt(nextAttempt);
            }
          }, RETRY_DELAY_MS);
          return;
        }

        if (cancelled) return;

        const finalError = cause instanceof Error
          ? cause
          : new Error('Изображение не найдено');
        await markMissing(finalError);
      }
    };

    void loadImage();

    return () => {
      cancelled = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [attempt, imageId, markMissing, retryKey, revoke]);

  useEffect(() => {
    renderFailureCountRef.current = 0;
    imageNameRef.current = imageId ?? 'изображение';
  }, [imageId]);

  useEffect(() => revoke, [revoke]);

  return {
    url,
    loading,
    error,
    missing,
    revoke,
    retry,
    reportImageLoadError,
    markImageLoaded,
  };
};
