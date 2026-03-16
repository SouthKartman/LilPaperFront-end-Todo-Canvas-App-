// src/widgets/projects-menu/ui/ProjectsMenu.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@shared/lib/state/store';
import { useProjects } from '@features/project-management';
import { 
  selectAllProjects,
  selectCurrentProject 
} from '@features/project-management/model/selectors';
import { CreateProjectModal } from '@widgets/create-project-modal/ui/CreateProjectModal';
import styles from './ProjectsMenu.module.css';

export const ProjectsMenu: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { createNewProject, deleteProject, openProject } = useProjects();
  const projects = useAppSelector(selectAllProjects);
  const currentProject = useAppSelector(selectCurrentProject);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreateProject = (name: string) => {
    createNewProject(name);
    setIsCreateModalOpen(false);
  };

  const handleProjectClick = (projectId: string) => {
    openProject(projectId);
    navigate(`/project/${projectId}`);
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Удалить проект?')) {
      deleteProject(projectId);
    }
  };

  const startEditing = (projectId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(projectId);
    setEditingName(currentName);
  };

  const saveEditing = (projectId: string) => {
    // TODO: добавить rename project
    setEditingProjectId(null);
  };

  const formatDate = (date: Date | string) => {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - dateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <div className={`${styles.menu} ${isExpanded ? styles.expanded : styles.collapsed}`}>
        {/* Header */}
        <div className={styles.header}>
          <button 
            className={styles.toggleBtn}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '◀' : '▶'}
          </button>
          {isExpanded && <span className={styles.title}>Projects</span>}
        </div>

        {/* Search */}
        {isExpanded && (
          <div className={styles.search}>
            <span className={styles.searchIcon}>🔍</span>
            <input 
              type="text" 
              placeholder="Search projects"
              className={styles.searchInput}
            />
          </div>
        )}

        {/* Projects List */}
        <div className={styles.projectsList}>
          {isExpanded && (
            <button 
              className={styles.createProjectBtn}
              onClick={() => setIsCreateModalOpen(true)}
            >
              <span className={styles.plusIcon}>+</span>
              <span>New project</span>
            </button>
          )}

          {projects.map((project) => (
            <div
              key={project.id}
              className={`${styles.projectItem} ${
                currentProject?.id === project.id ? styles.active : ''
              }`}
              onClick={() => handleProjectClick(project.id)}
            >
              {/* Project Icon */}
              <div className={styles.projectIcon}>
                {project.icon || '📁'}
              </div>

              {/* Project Info */}
              {isExpanded && (
                <>
                  {editingProjectId === project.id ? (
                    <input
                      type="text"
                      className={styles.editInput}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => saveEditing(project.id)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditing(project.id)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <div className={styles.projectInfo}>
                        <span className={styles.projectName}>{project.name}</span>
                        <span className={styles.projectDate}>
                          {formatDate(project.metadata.updatedAt)}
                        </span>
                      </div>

                      {/* Actions Menu */}
                      <div className={styles.projectActions}>
                        <button 
                          className={styles.actionBtn}
                          onClick={(e) => startEditing(project.id, project.name, e)}
                        >
                          ✎
                        </button>
                        <button 
                          className={styles.actionBtn}
                          onClick={(e) => handleDeleteProject(project.id, e)}
                        >
                          ×
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Collapsed view - only icon */}
              {!isExpanded && (
                <div className={styles.collapsedTooltip}>
                  {project.name}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        {isExpanded && (
          <div className={styles.footer}>
            <button className={styles.footerBtn}>
              <span>⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </>
  );
};