import { useCallback } from 'react';
import { useAppDispatch } from '@shared/lib/state';
import { addImageNode, setError, setLoading } from '../model/slice';
import { processImageFile, processImageFromUrl } from './imageProcessor';
import { ImageNode } from '@entities/image/model/types';

interface UseImageUploadProps {
  onUpload?: (image: ImageNode) => void;
}

export const useImageUpload = ({ onUpload }: UseImageUploadProps = {}) => {
  const dispatch = useAppDispatch();

  const uploadFromFile = useCallback(async (
    file: File,
    position: { x: number; y: number }
  ) => {
    try {
      dispatch(setLoading(true));
      
      const processed = await processImageFile(file);
      
      const imageNode: ImageNode = {
        ...processed,
        type: 'image',
        position,
        size: { width: processed.width, height: processed.height },
        zIndex: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      dispatch(addImageNode(imageNode));
      onUpload?.(imageNode);
      
      dispatch(setLoading(false));
      return imageNode;
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Ошибка загрузки'));
      dispatch(setLoading(false));
      throw error;
    }
  }, [dispatch, onUpload]);

  const uploadFromUrl = useCallback(async (
    url: string,
    position: { x: number; y: number }
  ) => {
    try {
      dispatch(setLoading(true));
      
      const processed = await processImageFromUrl(url);
      
      const imageNode: ImageNode = {
        ...processed,
        type: 'image',
        position,
        size: { width: processed.width, height: processed.height },
        zIndex: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      dispatch(addImageNode(imageNode));
      onUpload?.(imageNode);
      
      dispatch(setLoading(false));
      return imageNode;
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Ошибка загрузки по URL'));
      dispatch(setLoading(false));
      throw error;
    }
  }, [dispatch, onUpload]);

  return {
    uploadFromFile,
    uploadFromUrl,
  };
};