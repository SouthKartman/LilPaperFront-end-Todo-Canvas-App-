// src/entities/project/model/constants.ts
import { ProjectTemplate } from './types';

export const PROJECT_TEMPLATES: Record<ProjectTemplate, {
  name: string;
  icon: string;
  description: string;
  defaultPages: string[];
}> = {
  blank: {
    name: 'Пустой проект',
    icon: '📄',
    description: 'Начните с чистого холста',
    defaultPages: ['Страница 1']
  },
  personal: {
    name: 'Личные задачи',
    icon: '🏠',
    description: 'Для личных дел и заметок',
    defaultPages: ['Личное', 'Идеи', 'Покупки']
  },
  work: {
    name: 'Рабочий проект',
    icon: '💼',
    description: 'Для рабочих задач',
    defaultPages: ['Задачи', 'В процессе', 'Готово']
  },
  study: {
    name: 'Учеба',
    icon: '📚',
    description: 'Для учебных материалов',
    defaultPages: ['Лекции', 'ДЗ', 'Экзамены']
  }
} as const;