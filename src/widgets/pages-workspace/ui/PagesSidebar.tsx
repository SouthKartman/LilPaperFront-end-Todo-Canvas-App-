// widgets/pages-workspace/ui/PagesSidebar/PagesSidebar.tsx
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
  removePage,
  reorderPages 
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
  
  const handleDeletePage = (pageId: string) => {
    if (pages.length > 1) {
      dispatch(removePage({ 
        projectId: currentProject.id, 
        pageId 
      }));
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
      
      <div className={styles.projectInfo}>
        <div className={styles.projectName}>
          {currentProject.name}
        </div>
        <div className={styles.pageCount}>
          {pages.length} page{pages.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};