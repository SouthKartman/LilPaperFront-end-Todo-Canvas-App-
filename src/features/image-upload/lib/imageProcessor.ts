import { ProcessedImageData } from '@entities/image/model/types';
import { 
  calculateOptimalDimensions, 
  validateImageFile, 
  generateImageId 
} from '@entities/image/lib/imageHelpers';

export const processImageFile = (file: File): Promise<ProcessedImageData> => {
  return new Promise((resolve, reject) => {
    // Валидация
    const validation = validateImageFile(file);
    if (!validation.valid) {
      reject(new Error(validation.error));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = calculateOptimalDimensions(img.width, img.height);
        
        resolve({
          id: generateImageId(),
          src: e.target?.result as string,
          width,
          height,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        });
      };
      
      img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });
};

export const processMultipleImages = async (files: File[]): Promise<ProcessedImageData[]> => {
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  
  if (imageFiles.length === 0) {
    throw new Error('Нет файлов изображений');
  }
  
  const results = await Promise.allSettled(imageFiles.map(processImageFile));
  
  return results
    .filter((result): result is PromiseFulfilledResult<ProcessedImageData> => 
      result.status === 'fulfilled'
    )
    .map(result => result.value);
};

export const processImageFromUrl = async (url: string): Promise<ProcessedImageData> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const { width, height } = calculateOptimalDimensions(img.width, img.height);
      
      // Создаем canvas для конвертации в base64
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      const base64Data = canvas.toDataURL('image/png');
      
      resolve({
        id: generateImageId(),
        src: base64Data,
        width,
        height,
        originalName: url.split('/').pop() || 'image.png',
        fileSize: base64Data.length,
        mimeType: 'image/png',
      });
    };
    
    img.onerror = () => reject(new Error('Ошибка загрузки изображения по URL'));
    img.src = url;
  });
};