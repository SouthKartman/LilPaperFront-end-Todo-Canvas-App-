// Типы для изображений - только data структуры, без UI
export type ImageNodeType = 'image' | 'todo-image';

export interface ImageNode {
  id: string;
  type: ImageNodeType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  
  // Данные изображения
  src: string;              // base64 или URL
  originalName: string;      // Исходное имя файла
  fileSize: number;          // Размер в байтах
  mimeType: string;          // image/png, image/jpeg и т.д.
  
  // Метаданные
  createdAt: string;
  updatedAt: string;
  
  // Для связи с задачами
  linkedTodoId?: string;
  
  // Опционально
  alt?: string;
  caption?: string;
}

export interface ProcessedImageData {
  id: string;
  src: string;
  width: number;
  height: number;
  originalName: string;
  fileSize: number;
  mimeType: string;
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}