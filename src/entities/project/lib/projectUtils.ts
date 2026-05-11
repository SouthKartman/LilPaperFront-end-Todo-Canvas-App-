// src/entities/project/lib/projectUtils.ts
import { Project, ProjectCreateDTO } from '../model/types';
import { PROJECT_TEMPLATES } from '../model/constants';

export const createDefaultProject = (dto: ProjectCreateDTO) => {
  const template = dto.template || 'blank';
  const templateConfig = PROJECT_TEMPLATES[template];
  
  return {
    name: dto.name || templateConfig.name,
    icon: dto.icon || templateConfig.icon,
    description: dto.description || templateConfig.description,
    template,
    defaultPages: templateConfig.defaultPages
  };
};

export const validateProjectName = (name: string): boolean => {
  return name.length >= 3 && name.length <= 50;
};

export const formatProjectDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  if (diffDays < 7) return `${diffDays} дня назад`;
  return date.toLocaleDateString('ru-RU');
};