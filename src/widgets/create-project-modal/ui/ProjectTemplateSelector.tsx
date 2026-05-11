// src/widgets/create-project-modal/ui/ProjectTemplateSelector.tsx
import React from 'react';
import styles from './ProjectTemplateSelector.module.css'; // 👈 импорт стилей

export type TemplateType = 'blank' | 'personal' | 'work' | 'study';

interface Template {
  name: string;
  icon: string;
  description: string;
}

const TEMPLATES: Record<TemplateType, Template> = {
  blank: {
    name: 'Пустой проект',
    icon: '📄',
    description: 'Начните с чистого холста',
  },
  personal: {
    name: 'Личные задачи',
    icon: '🏠',
    description: 'Для личных дел и заметок',
  },
  work: {
    name: 'Рабочий проект',
    icon: '💼',
    description: 'Для рабочих задач',
  },
  study: {
    name: 'Учеба',
    icon: '📚',
    description: 'Для учебных материалов',
  },
};

interface ProjectTemplateSelectorProps {
  selected: TemplateType;
  onChange: (template: TemplateType) => void;
}

export const ProjectTemplateSelector: React.FC<ProjectTemplateSelectorProps> = ({
  selected,
  onChange,
}) => {
  return (
    <div className={styles.container}>
      <label className={styles.label}>Шаблон проекта</label>
      <div className={styles.grid}>
        {(Object.entries(TEMPLATES) as [TemplateType, Template][]).map(([key, template]) => (
          <button
            key={key}
            type="button"
            className={`${styles.template} ${selected === key ? styles.selected : ''}`}
            onClick={() => onChange(key)}
          >
            <span className={styles.icon}>{template.icon}</span>
            <div className={styles.info}>
              <span className={styles.name}>{template.name}</span>
              <span className={styles.description}>{template.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};