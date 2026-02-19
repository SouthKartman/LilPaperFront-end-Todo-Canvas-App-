// Конфигурация путей для сохранения файлов
export const STORAGE_CONFIG = {
  // Базовый путь для изображений (можно легко поменять)
  imagesBasePath: '/images',
  
  // Структура папок
  folders: {
    projects: 'projects',
    temp: 'temp',
  },
  
  // Максимальный размер файла (в байтах)
  maxFileSize: 10 * 1024 * 1024, // 10MB
  
  // ✅ Исправлено: добавляем 'as const' для точной типизации
  allowedTypes: [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp', 
    'image/svg+xml'
  ] as const,
  
  // Качество сжатия для JPEG (0-1)
  jpegQuality: 0.85,
} as const;

// 🆕 Создаем тип из конфига
export type AllowedImageType = typeof STORAGE_CONFIG.allowedTypes[number];

// Вспомогательные функции для построения путей
export const getImagePath = (projectId: string, fileName: string): string => {
  return `${STORAGE_CONFIG.imagesBasePath}/${STORAGE_CONFIG.folders.projects}/${projectId}/${fileName}`;
};

export const getProjectImagesFolder = (projectId: string): string => {
  return `${STORAGE_CONFIG.imagesBasePath}/${STORAGE_CONFIG.folders.projects}/${projectId}`;
};