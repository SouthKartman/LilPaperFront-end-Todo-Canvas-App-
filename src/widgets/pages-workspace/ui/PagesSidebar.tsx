import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectCurrentProject, 
  selectProjectPages,
  selectCurrentPageId 
} from '@features/project-management/model/selectors';
import { 
  addPage, 
  switchPage, 
  setPageName, 
  setProjectName, // 🆕 Импортируем action для переименования проекта
  removePage,
  reorderPages,
  deletePageFromDB,
  renameProjectInDB // 🆕 Импортируем thunk для переименования проекта
} from '@features/project-management/model/slice';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PageItem } from './PageItem';
import styles from './PagesSidebar.module.css';

export const PagesSidebar: React.FC = () => {
  const dispatch = useDispatch();
  const currentProject = useSelector(selectCurrentProject);
  const pages = useSelector(selectProjectPages);
  const currentPageId = useSelector(selectCurrentPageId);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [isRenamingProject, setIsRenamingProject] = useState<boolean>(false);
  const [projectName, setProjectNameInput] = useState<string>(currentProject?.name || '');
  
  if (!currentProject) {
    return (
      <div className={styles.pagesSidebar}>
        <div className={styles.emptyState}>
          <p>No project loaded</p>
          <button 
            className={styles.createProjectBtn}
            onClick={() => dispatch(addPage({ projectId: 'temp', name: 'New Project' }))}
          >
            Create New Project
          </button>
        </div>
      </div>
    );
  }
  
  const handleAddPage = () => {
    dispatch(addPage({ 
      projectId: currentProject.id,
      name: `Page ${pages.length + 1}`
    }));
  };
  
  const handleSwitchPage = (pageId: string) => {
    dispatch(switchPage({ 
      projectId: currentProject.id, 
      pageId 
    }));
  };
  
  const handleRenamePage = (pageId: string, newName: string) => {
    dispatch(setPageName({ pageId, name: newName }));
    setRenamingPageId(null);
  };
  
  const handleDeletePage = async (pageId: string) => {
    if (pages.length > 1) {
      await dispatch(deletePageFromDB({ 
        projectId: currentProject.id, 
        pageId 
      })).unwrap();
    }
  };
  
  // 🆕 Обработчик начала переименования проекта
  const handleStartRenameProject = () => {
    setProjectNameInput(currentProject.name);
    setIsRenamingProject(true);
  };
  
  // 🆕 Обработчик сохранения имени проекта
  const handleRenameProject = async () => {
    if (projectName.trim() && projectName.trim() !== currentProject.name) {
      const newName = projectName.trim();
      
      // Обновляем в Redux
      dispatch(setProjectName({ 
        projectId: currentProject.id, 
        name: newName 
      }));
      
      // Обновляем в IndexedDB
      await dispatch(renameProjectInDB({ 
        projectId: currentProject.id, 
        name: newName 
      })).unwrap();
    }
    setIsRenamingProject(false);
  };
  
  // 🆕 Обработчик отмены переименования
  const handleCancelRenameProject = () => {
    setIsRenamingProject(false);
    setProjectNameInput(currentProject.name);
  };
  
  // 🆕 Обработчик нажатия Enter
  const handleProjectNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameProject();
    } else if (e.key === 'Escape') {
      handleCancelRenameProject();
    }
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const fromIndex = pages.findIndex(p => p.id === active.id);
      const toIndex = pages.findIndex(p => p.id === over.id);
      
      if (fromIndex !== -1 && toIndex !== -1) {
        dispatch(reorderPages({ 
          projectId: currentProject.id, 
          fromIndex, 
          toIndex 
        }));
      }
    }
  };
  
  return (
    <div className={styles.pagesSidebar}>
      <div className={styles.header}>
        <h3 className={styles.title}>Pages</h3>
        <span className={styles.count}>{pages.length}</span>
        <button 
          className={styles.addButton}
          onClick={handleAddPage}
          title="Add New Page"
        >
          +
        </button>
      </div>
      
      <div className={styles.pagesList}>
        <DndContext 
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={pages.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {pages.map((page) => (
              <PageItem
                key={page.id}
                page={page}
                isActive={page.id === currentPageId}
                isRenaming={renamingPageId === page.id}
                onSelect={() => handleSwitchPage(page.id)}
                onRenameStart={() => setRenamingPageId(page.id)}
                onRename={(newName) => handleRenamePage(page.id, newName)}
                onRenameCancel={() => setRenamingPageId(null)}
                onDelete={() => handleDeletePage(page.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      
      {/* 🆕 Обновленная секция проекта с возможностью переименования */}
      <div className={styles.projectInfo}>
        <div className={styles.projectInfoHeader}>
          <div className={styles.projectIcon}>📁</div>
          {isRenamingProject ? (
            <input
              type="text"
              className={styles.projectNameInput}
              value={projectName}
              onChange={(e) => setProjectNameInput(e.target.value)}
              onBlur={handleRenameProject}
              onKeyDown={handleProjectNameKeyDown}
              autoFocus
            />
          ) : (
            <div 
              className={styles.projectName}
              onDoubleClick={handleStartRenameProject}
              title="Double-click to rename"
            >
              {currentProject.name}
            </div>
          )}
          <button 
            className={styles.renameProjectButton}
            onClick={handleStartRenameProject}
            title="Rename project"
          >
            ✏️
          </button>
        </div>
        <div className={styles.pageCount}>
          {pages.length} page{pages.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};