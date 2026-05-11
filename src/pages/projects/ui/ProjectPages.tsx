// src/pages/projects/ui/ProjectsPage.tsx
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useProjects } from '@features/project-management';
import { ProjectCard } from '@widgets/projects-list/ui/ProjectCard';
import { CreateProjectModal } from '@widgets/create-project-modal/ui/CreateProjectModal';
import { ProjectsBatchExportService } from '@features/project-management/lib/projectsBatchExport';
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
import { db } from '@shared/api/storage/indexedDB/schema';
import { loadProjectState } from '@features/project-management/model/slice';
import styles from './ProjectsPage.module.css';
import { StorageManager } from '@features/storage/ui/StorageManager';
import { TodoStorage } from '@shared/api/storage/jsonStorage/todoStorage';
import { useAppModal } from '@shared/ui/kit/Modal/AppModal';
import { RootState } from '@shared/lib/state/store'
import { Logo } from '@shared/ui/icons/Logo/Logo';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'recent';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { 
    allProjects, 
    recentProjects, 
    createNewProject, 
    deleteProject, 
    reorderProjectsList,
  } = useProjects();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  
  //  // Получаем состояние один раз в хуке
  // const nodes = useSelector((state: RootState) => state.todoNodes.nodes);
  
  // const [lastSave, setLastSave] = useState<Date | null>(null);
  // const [isSaving, setIsSaving] = useState(false);

  // Загружаем время последнего сохранения
  // useEffect(() => {
  //   const savedDate = TodoStorage.getLastSave();
  //   setLastSave(savedDate);
  // }, []);
  

  const { openModal } = useAppModal();
  
  const handleOpenStorageManager = () => {
    openModal(
      <StorageManager modalMode={true} />,
      {
        title: ' ',
        width: '800px',
        height: 'auto',
        onClose: () => {
          console.log('Storage manager закрыт');
        }
      }
    );
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const displayedProjects = useMemo(() => {
    let projects = filterType === 'recent' ? recentProjects : allProjects;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      projects = projects.filter(project =>
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
      );
    }
    
    return projects;
  }, [allProjects, recentProjects, filterType, searchQuery]);

  const handleDragStart = () => setIsDragging(true);
  
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

  // Экспорт ВСЕХ проектов с изображениями
  const handleExportAllProjects = useCallback(async () => {
    if (allProjects.length === 0) {
      alert('Нет проектов для экспорта');
      return;
    }
    
    setIsExporting(true);
    setProgress(0);
    setProgressMessage('');
    
    try {
      const zipBlob = await ProjectsBatchExportService.exportAllProjects(
        allProjects,
        (percent, message) => {
          setProgress(percent);
          setProgressMessage(message);
        }
      );
      
      const fileName = `all_projects_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.canvas`;
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(zipBlob);
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`✅ Экспортировано ${allProjects.length} проектов с изображениями`);
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      alert('❌ Ошибка при экспорте проектов');
    } finally {
      setIsExporting(false);
      setProgress(0);
      setProgressMessage('');
    }
  }, [allProjects]);

  // Импорт проектов из ZIP с изображениями
  const handleImportProjects = useCallback(async (file: File) => {
    setIsImporting(true);
    setProgress(0);
    setProgressMessage('');
    
    try {
      const result = await ProjectsBatchExportService.importProjects(
        file,
        (percent, message) => {
          setProgress(percent);
          setProgressMessage(message);
        }
      );
      
      if (result.success) {
        // Обновляем Redux состояние
        const allProjectsFromDB = await db.projects.toArray();
        const projectsMap = allProjectsFromDB.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<string, any>);
        
        dispatch(loadProjectState({
          currentProjectId: null,
          projects: projectsMap,
          pages: {},
          canvases: {},
          projectOrder: allProjectsFromDB.map(p => p.id),
        }));
        
        alert(
          `✅ Импорт завершен!\n\n` +
          `📁 Проектов: ${result.importedProjects}\n` +
          `📄 Страниц: ${result.importedPages}\n` +
          `📝 Задач: ${result.importedTodos}\n` +
          `🖼️ Изображений: ${result.importedImages}\n` +
          `${result.errors.length > 0 ? `⚠️ Ошибок: ${result.errors.length}` : ''}`
        );
      } else {
        alert(`❌ Ошибка импорта:\n${result.errors.join('\n')}`);
      }
    } catch (error) {
      console.error('Ошибка импорта:', error);
      alert('❌ Ошибка при импорте проектов');
    } finally {
      setIsImporting(false);
      setProgress(0);
      setProgressMessage('');
    }
  }, [dispatch]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportProjects(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleImportProjects]);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Logo width='300px' height = '140px'></Logo>
          {/* <h1 className={styles.title}>Projects</h1> */}
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
              onClick={handleOpenStorageManager}
              className="storage-btn"
              >
              📁 Хранилище
          </button>
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

      {/* Progress bar */}
      {(isExporting || isImporting) && progress > 0 && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.progressMessage}>{progressMessage}</div>
          <div className={styles.progressPercent}>{Math.round(progress)}%</div>
        </div>
      )}

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

      <style>{`
        .progressContainer {
          margin: 16px 0;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .progressBar {
          width: 100%;
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
        }
        .progressFill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transition: width 0.3s ease;
          border-radius: 4px;
        }
        .progressMessage {
          font-size: 12px;
          color: #666;
          margin-top: 8px;
        }
        .progressPercent {
          font-size: 12px;
          font-weight: 500;
          color: #667eea;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
};