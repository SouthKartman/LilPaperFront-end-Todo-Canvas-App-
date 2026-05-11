// src/features/image-upload/lib/useImageUpload.ts
import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { processMultipleImages } from './imageProcessor';
import { addImageNodes } from '../model/slice';
import { selectCurrentProject } from '@features/project-management/model/selectors';
import { db } from '@shared/api/storage/indexedDB/schema';

// Временный тип для ноды в процессе загрузки
interface UploadingImageNode {
  tempId: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  progress: number;
}

export const useImageUpload = () => {
  const dispatch = useDispatch();
  const currentProject = useSelector(selectCurrentProject);
  const [uploadingImages, setUploadingImages] = useState<UploadingImageNode[]>([]);
  const [justUploadedIds, setJustUploadedIds] = useState<Set<string>>(new Set());

  const uploadImages = useCallback(async (
    files: File[],
    startPosition: { x: number; y: number }
  ) => {
    console.log('📤 useImageUpload.uploadImages', { files: files.length, startPosition });
    
    if (!currentProject) {
      throw new Error('Нет текущего проекта');
    }

    // Создаем временные ноды для отображения прелоадера
    const tempNodes: UploadingImageNode[] = files.map((file, index) => ({
      tempId: `uploading-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      position: {
        x: startPosition.x + (index * 250),
        y: startPosition.y,
      },
      size: {
        width: 300,
        height: 200,
      },
      progress: 0,
    }));

    setUploadingImages(tempNodes);

    try {
      // Прогресс для каждого файла
      const progressIntervals = tempNodes.map((node, index) => {
        return setInterval(() => {
          setUploadingImages(prev => 
            prev.map(img => 
              img.tempId === node.tempId 
                ? { ...img, progress: Math.min(img.progress + 5, 90) } // Медленнее
                : img
            )
          );
        }, 500 + index * 150); // Медленнее
      });

      const imagesData = await processMultipleImages(
        files,
        currentProject.id,
        startPosition
      );

      progressIntervals.forEach(interval => clearInterval(interval));

      setUploadingImages(prev => 
        prev.map(img => ({ ...img, progress: 100 }))
      );

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
        pageId: currentProject.currentPageId || 'default',
      }));

      // Ждем подтверждения от IndexedDB (увеличиваем попытки)
      for (const node of imageNodes) {
        const pathMatch = node.filePath.match(/\/images\/projects\/([^/]+)\/(.+)$/);
        if (pathMatch) {
          const [, projectId, fileName] = pathMatch;
          const fileId = `${projectId}_${fileName}`;
          
          let attempts = 0;
          let stored = null;
          
          // Увеличиваем до 20 попыток по 300мс (6 секунд)
          while (!stored && attempts < 20) {
            stored = await db.fileStorage.get(fileId);
            if (!stored) {
              await new Promise(resolve => setTimeout(resolve, 300));
              attempts++;
            }
          }
          
          if (stored) {
            console.log(`✅ Файл ${fileName} подтвержден (${attempts * 300}ms)`);
          } else {
            console.warn(`⚠️ Файл ${fileName} не подтвержден после 6 секунд`);
          }
        }
      }

      dispatch(addImageNodes(imageNodes));
      
      const newIds = new Set(imageNodes.map(node => node.id));
      setJustUploadedIds(newIds);
      
      // Увеличиваем время показа skipLoading до 5 секунд
      setTimeout(() => {
        setUploadingImages([]);
        
        setTimeout(() => {
          setJustUploadedIds(new Set());
        }, 5000); // 5 секунд вместо 3
      }, 500);

      return imageNodes;
    } catch (error) {
      console.error('❌ Ошибка в uploadImages:', error);
      setUploadingImages([]);
      setJustUploadedIds(new Set());
      throw error;
    }
  }, [currentProject, dispatch]);

  return {
    uploadImages,
    uploadingImages,
    justUploadedIds,
  };
};