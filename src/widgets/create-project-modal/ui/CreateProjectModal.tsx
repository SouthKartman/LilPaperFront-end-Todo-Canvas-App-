// src/widgets/create-project-modal/ui/CreateProjectModal.tsx
import React, { useState } from 'react';
import { UniversalModal } from '@shared/ui/kit/Modal/UniversalModal';
import { ProjectTemplateSelector, TemplateType } from './ProjectTemplateSelector';
import styles from './CreateProjectModal.module.css';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (name: string) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
}) => {
  const [projectName, setProjectName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('blank');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName.trim()) {
      onCreateProject(projectName.trim());
      setProjectName('');
      onClose();
    }
  };

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Создание нового проекта"
      size="md"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <ProjectTemplateSelector
          selected={selectedTemplate}
          onChange={setSelectedTemplate}
        />

        <div className={styles.field}>
          <label htmlFor="project-name" className={styles.label}>
            Название проекта
          </label>
          <input
            id="project-name"
            type="text"
            className={styles.input}
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Введите название проекта"
            autoFocus
            required
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
          <button 
            type="submit" 
            className={styles.submitBtn}
            disabled={!projectName.trim()}
          >
            Создать проект
          </button>
        </div>
      </form>
    </UniversalModal>
  );
};