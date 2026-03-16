// src/widgets/recent-projects/ui/RecentProjects.tsx
import React from 'react';
import { CanvasProject } from '@entities/canvas/model/types';
import { ProjectsList } from '@widgets/projects-list/ui/ProjectsList';
import styles from './RecentProjects.module.css';

interface RecentProjectsProps {
  projects?: CanvasProject[]; // 👈 делаем опциональным
  onProjectClick: (projectId: string) => void;
  onProjectDelete?: (projectId: string, e: React.MouseEvent) => void;
}

export const RecentProjects: React.FC<RecentProjectsProps> = ({
  projects = [], // 👈 значение по умолчанию
  onProjectClick,
  onProjectDelete,
}) => {
  // 👈 проверяем, что projects существует и это массив
  if (!projects || !Array.isArray(projects) || projects.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Недавние проекты</h2>
      <ProjectsList
        projects={projects.slice(0, 3)} // показываем только 3 последних
        onProjectClick={onProjectClick}
        onProjectDelete={onProjectDelete}
        variant="grid"
      />
    </section>
  );
};