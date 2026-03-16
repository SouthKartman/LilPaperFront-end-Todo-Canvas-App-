// src/widgets/projects-list/ui/ProjectsList.tsx
import React from 'react';
import { CanvasProject } from '@entities/canvas/model/types';
import { ProjectCard } from './ProjectCard';
import styles from './ProjectsList.module.css';

interface ProjectsListProps {
  projects?: CanvasProject[]; // 👈 опционально
  onProjectClick: (projectId: string) => void;
  onProjectDelete?: (projectId: string, e: React.MouseEvent) => void;
  emptyMessage?: string;
  variant?: 'grid' | 'list';
}

export const ProjectsList: React.FC<ProjectsListProps> = ({
  projects = [], // 👈 значение по умолчанию
  onProjectClick,
  onProjectDelete,
  emptyMessage = 'Нет проектов',
  variant = 'grid',
}) => {
  // 👈 проверяем длину
  if (!projects || projects.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>📁</div>
        <p className={styles.emptyMessage}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${styles[variant]}`}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => onProjectClick(project.id)}
          onDelete={onProjectDelete ? (e) => onProjectDelete(project.id, e) : undefined}
        />
      ))}
    </div>
  );
};