// features/image-upload/lib/useImageUpload.ts

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { processMultipleImages } from './imageProcessor'; // 👈 Только один импорт
import { addImageNodes } from '../model/slice';
import { selectCurrentProject } from '@features/project-management/model/selectors';

export const useImageUpload = () => {
  const dispatch = useDispatch();
  const currentProject = useSelector(selectCurrentProject);

  const uploadImages = useCallback(async (
    files: File[],
    startPosition: { x: number; y: number }
  ) => {
    console.log('📤 useImageUpload.uploadImages ВЫЗВАНА', { 
      files: files.map(f => f.name), 
      startPosition,
      currentProject,
      hasProcessMultipleImages: !!processMultipleImages,
      typeOfProcessMultipleImages: typeof processMultipleImages
    });
    
    if (!currentProject) {
      throw new Error('Нет текущего проекта');
    }

    try {
      console.log('🔄 Вызываю processMultipleImages...');
      
      // 👈 Пробуем вызвать
      const imagesData = await processMultipleImages(
        files,
        currentProject.id,
        startPosition
      );

      console.log('✅ processMultipleImages вернула:', imagesData);

      // Создаем ноды
      const imageNodes = imagesData.map((data, index) => ({
        id: data.id,
        type: 'image' as const,
        position: {
          x: startPosition.x + (index * 250),
          y: startPosition.y,
        },
        size: {
          width: data.width,
          height: data.height,
        },
        zIndex: 1,
        filePath: data.filePath,
        originalName: data.originalName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      dispatch(addImageNodes(imageNodes));
      
      return imageNodes;
    } catch (error) {
      console.error('❌ Ошибка в uploadImages:', error);
      throw error;
    }
  }, [currentProject, dispatch]);

  const uploadSingleImage = useCallback(async (
    file: File,
    position: { x: number; y: number }
  ) => {
    const results = await uploadImages([file], position);
    return results[0];
  }, [uploadImages]);

  return {
    uploadImages,
    uploadSingleImage,
  };
};