// src/pages/projects/ui/ProjectsPage.tsx
import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@shared/lib/state/store';
import { useProjects } from '@features/project-management';
import { ProjectCard } from '@widgets/projects-list/ui/ProjectCard';
import { CreateProjectModal } from '@widgets/create-project-modal/ui/CreateProjectModal';
import { 
  DndContext, 
  closestCenter, 
  DragEndEvent,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  rectSortingStrategy 
} from '@dnd-kit/sortable';
import styles from './ProjectsPage.module.css';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'recent';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    allProjects, 
    recentProjects, 
    createNewProject, 
    deleteProject, 
    reorderProjectsList,
    exportProjects,
    importProjects
  } = useProjects();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Настройка сенсоров для DnD
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Фильтрация и сортировка проектов
  const displayedProjects = useMemo(() => {
    // Сначала выбираем по фильтру (all или recent)
    let projects = filterType === 'recent' ? recentProjects : allProjects;
    
    // Затем применяем поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      projects = projects.filter(project =>
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
      );
    }
    
    return projects;
  }, [allProjects, recentProjects, filterType, searchQuery]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;
    
    if (over && active.id !== over.id && filterType === 'all') {
      const oldIndex = displayedProjects.findIndex(p => p.id === active.id);
      const newIndex = displayedProjects.findIndex(p => p.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderProjectsList(oldIndex, newIndex);
      }
    }
  };

  const handleProjectClick = (projectId: string) => {
    if (!isDragging) {
      navigate(`/project/${projectId}`);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId);
  };

  const handleExport = () => {
    exportProjects();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importProjects(file);
    }
    // Сброс input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Projects</h1>
          <div className={styles.projectCount}>
            {allProjects.length} {allProjects.length === 1 ? 'project' : 'projects'}
          </div>
        </div>
        
        <div className={styles.headerActions}>
          {/* View toggle */}
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.active : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <span className={styles.icon}>⊞</span>
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <span className={styles.icon}>☰</span>
            </button>
          </div>

          {/* Import/Export */}
          <div className={styles.importExport}>
            <button
              className={styles.exportBtn}
              onClick={handleExport}
              title="Export projects"
            >
              <span className={styles.icon}>↓</span>
              <span>Export</span>
            </button>
            <button
              className={styles.importBtn}
              onClick={() => fileInputRef.current?.click()}
              title="Import projects"
            >
              <span className={styles.icon}>↑</span>
              <span>Import</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </div>

          {/* Create button */}
          <button
            className={styles.createBtn}
            onClick={() => setIsCreateModalOpen(true)}
          >
            <span className={styles.icon}>+</span>
            <span>New project</span>
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className={styles.controls}>
        <div className={styles.searchContainer}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className={styles.clearSearch}
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>

        <div className={styles.filterTabs}>
          <button
            className={`${styles.filterTab} ${filterType === 'all' ? styles.active : ''}`}
            onClick={() => setFilterType('all')}
          >
            <span className={styles.icon}>📁</span>
            <span>All projects</span>
            <span className={styles.badge}>{allProjects.length}</span>
          </button>
          <button
            className={`${styles.filterTab} ${filterType === 'recent' ? styles.active : ''}`}
            onClick={() => setFilterType('recent')}
          >
            <span className={styles.icon}>🕒</span>
            <span>Recent</span>
            <span className={styles.badge}>{recentProjects.length}</span>
          </button>
        </div>
      </div>

      {/* Projects grid */}
      {displayedProjects.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            {searchQuery ? '🔍' : filterType === 'recent' ? '🕒' : '📁'}
          </div>
          <h3 className={styles.emptyTitle}>
            {searchQuery 
              ? 'No projects found'
              : filterType === 'recent'
                ? 'No recent projects'
                : 'No projects yet'}
          </h3>
          <p className={styles.emptyText}>
            {searchQuery 
              ? `No projects matching "${searchQuery}"`
              : filterType === 'recent'
                ? 'Projects you open will appear here'
                : 'Create your first project to get started'}
          </p>
          {!searchQuery && filterType !== 'recent' && (
            <button
              className={styles.emptyBtn}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create your first project
            </button>
          )}
        </div>
      ) : (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter} 
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayedProjects.map(p => p.id)}
            strategy={viewMode === 'list' ? verticalListSortingStrategy : rectSortingStrategy}
          >
            <div className={`${styles.grid} ${styles[viewMode]}`}>
              {displayedProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  viewMode={viewMode}
                  onClick={() => handleProjectClick(project.id)}
                  onDelete={handleDeleteProject}
                  isDraggable={filterType === 'all' && !searchQuery}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateProject={createNewProject}
      />
    </div>
  );
};