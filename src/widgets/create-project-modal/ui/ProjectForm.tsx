// src/widgets/create-project-modal/ui/ProjectForm.tsx
import React, { useState } from 'react';
import { ProjectCreateDTO } from '@entities/project/model/types';
import { validateProjectName } from '@entities/project/lib/projectUtils';

interface ProjectFormProps {
  onSubmit: (data: ProjectCreateDTO) => void;
  onCancel: () => void;
  initialData?: Partial<ProjectCreateDTO>;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  onSubmit,
  onCancel,
  initialData = {},
}) => {
  const [name, setName] = useState(initialData.name || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [errors, setErrors] = useState<{ name?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    if (name && !validateProjectName(name)) {
      setErrors({ name: 'Название должно быть от 3 до 50 символов' });
      return;
    }
    
    onSubmit({
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      template: initialData.template,
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="project-name" className={styles.label}>
          Название проекта
          <span className={styles.optional}>(необязательно)</span>
        </label>
        <input
          id="project-name"
          type="text"
          className={`${styles.input} ${errors.name ? styles.error : ''}`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors({});
          }}
          placeholder="Введите название проекта"
          autoFocus
        />
        {errors.name && (
          <span className={styles.errorMessage}>{errors.name}</span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="project-description" className={styles.label}>
          Описание
          <span className={styles.optional}>(необязательно)</span>
        </label>
        <textarea
          id="project-description"
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Краткое описание проекта..."
          rows={3}
        />
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>
          Отмена
        </button>
        <button type="submit" className={styles.submitBtn}>
          Создать проект
        </button>
      </div>
    </form>
  );
};