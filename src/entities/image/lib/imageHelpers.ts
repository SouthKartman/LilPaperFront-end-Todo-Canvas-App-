// entities/image/lib/imageHelpers

import { ImageValidationResult, ProcessedImageData } from '../model/types';

/**
 * Чистая функция для расчета оптимальных размеров изображения
 */
export const calculateOptimalDimensions = (
  originalWidth: number, 
  originalHeight: number,
  maxWidth: number = 400,
  maxHeight: number = 300
): { width: number; height: number } => {
  let width = originalWidth;
  let height = originalHeight;
  
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }
  
  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }
  
  return { width: Math.round(width), height: Math.round(height) };
};

/**
 * Чистая функция для валидации файла изображения
 */
export const validateImageFile = (file: File): ImageValidationResult => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Неподдерживаемый формат. Используйте JPEG, PNG, GIF, WEBP или SVG' 
    };
  }
  
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: 'Файл слишком большой. Максимальный размер 10MB' 
    };
  }
  
  return { valid: true };
};

/**
 * Генерация уникального ID для изображения
 */
export const generateImageId = (): string => {
  return `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Форматирование размера файла для отображения
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

/**
 * Получение иконки для типа файла
 */
export const getFileTypeIcon = (mimeType: string): string => {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '🖼️';
  if (mimeType.includes('png')) return '🖼️';
  if (mimeType.includes('gif')) return '🎞️';
  if (mimeType.includes('svg')) return '✨';
  if (mimeType.includes('webp')) return '🌐';
  return '📷';
};