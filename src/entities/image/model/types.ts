// Типы для изображений - только data структуры, без UI
export type ImageNodeType = 'image' | 'todo-image';

export interface ImageNode {
  id: string;
  type: ImageNodeType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  
  // 🆕 ИЗМЕНЕНО: теперь храним путь к файлу, а не base64
  filePath: string;           // Путь к файлу (например: /images/projects/project-1/image-123.jpg)
  
  // Метаданные файла
  originalName: string;       // Исходное имя файла
  fileSize: number;           // Размер в байтах
  mimeType: string;           // image/png, image/jpeg и т.д.
  
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
  filePath: string;
  width: number;
  height: number;
  originalName: string;
  fileSize: number;
  mimeType: string;
  position?: { x: number; y: number }; // 🆕 Добавляем опциональную позицию
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}