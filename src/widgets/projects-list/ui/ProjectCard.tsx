// src/widgets/projects-list/ui/ProjectCard.tsx
import React, { useState, useEffect } from 'react';
import { CanvasProject } from '@entities/canvas/model/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { previewService } from '@features/canvas-preview/lib/previewService';
import styles from './ProjectCard.module.css';

interface ProjectCardProps {
  project: CanvasProject;
  viewMode: 'grid' | 'list';
  onClick: () => void;
  onDelete: (projectId: string) => void;
  isDraggable?: boolean;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  viewMode,
  onClick,
  onDelete,
  isDraggable = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadAttempts, setLoadAttempts] = useState(0);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: project.id,
    disabled: !isDraggable
  });

  // Загружаем превью при монтировании
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const loadPreview = async () => {
      setIsLoading(true);
      console.log('🖼️ Загрузка превью для проекта:', project.id, 'попытка', loadAttempts + 1);
      
      const previewUrl = await previewService.getProjectPreview(project.id);
      
      if (mounted) {
        if (previewUrl && previewUrl !== 'data:,') {
          console.log('✅ Превью загружено, размер:', Math.round(previewUrl.length / 1024), 'KB');
          setPreview(previewUrl);
          setIsLoading(false);
        } else if (loadAttempts < 3) {
          console.log('⚠️ Превью не найдено, повтор через 1с');
          timeoutId = setTimeout(() => {
            setLoadAttempts(prev => prev + 1);
          }, 1000);
        } else {
          console.log('❌ Превью не найдено после 3 попыток');
          setIsLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [project.id, loadAttempts]);

  // Следим за обновлением preview в проекте
  useEffect(() => {
    if ((project as any).preview && (project as any).preview !== 'data:,') {
      const projectPreview = (project as any).preview;
      if (projectPreview !== preview) {
        console.log('🔄 Preview обновился в проекте');
        setPreview(projectPreview);
        setIsLoading(false);
      }
    }
  }, [(project as any).preview]);

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) return 'today';
    if (diff === 1) return 'yesterday';
    if (diff < 7) return `${diff} days ago`;
    return d.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    if ((e.target as HTMLElement).closest(`.${styles.deleteBtn}`) ||
        (e.target as HTMLElement).closest(`.${styles.refreshBadge}`)) {
      return;
    }
    onClick();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(project.id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const handleRefreshPreview = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    const newPreview = await previewService.refreshPreview(project.id);
    if (newPreview && newPreview !== 'data:,') {
      setPreview(newPreview);
    }
    setIsLoading(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${styles[viewMode]} ${isDragging ? styles.dragging : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowDeleteConfirm(false);
      }}
      onClick={handleClick}
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
    >
      {isDraggable && <div className={styles.dragHandle}>⋮⋮</div>}

      {/* Preview */}
      <div className={styles.previewContainer}>
        {isLoading ? (
          <div className={styles.previewLoading}>
            <div className={styles.spinner} />
          </div>
        ) : preview && preview !== 'data:,' ? (
          <img 
            src={preview} 
            alt={project.name}
            className={styles.previewImage}
            onLoad={() => console.log('✅ Image loaded successfully')}
            onError={(e) => {
              console.error('❌ Image failed to load');
              e.currentTarget.style.display = 'none';
              // Показываем placeholder при ошибке
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const placeholder = document.createElement('div');
                placeholder.className = styles.previewPlaceholder;
                placeholder.innerHTML = '<span>📁</span><span>Preview error</span>';
                parent.appendChild(placeholder);
              }
            }}
          />
        ) : (
          <div className={styles.previewPlaceholder}>
            <span className={styles.placeholderIcon}>📁</span>
            <span className={styles.placeholderText}>No preview</span>
          </div>
        )}
        
        {/* Badges */}
        <div className={styles.previewBadges}>
          <span className={styles.pageBadge}>
            {project.pageIds.length} 📄
          </span>
          <button 
            className={styles.refreshBadge}
            onClick={handleRefreshPreview}
            title="Refresh preview"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <h3 className={styles.title}>{project.name}</h3>
        <div className={styles.meta}>
          <span>Updated {formatDate(project.metadata.updatedAt)}</span>
        </div>
      </div>

      {/* Delete button */}
      {isHovered && !isDragging && (
        <div className={styles.deleteWrapper}>
          {!showDeleteConfirm ? (
            <button
              className={styles.deleteBtn}
              onClick={handleDeleteClick}
              title="Delete project"
            >
              ×
            </button>
          ) : (
            <div className={styles.deleteConfirm}>
              <span>Delete?</span>
              <button 
                className={styles.confirmYes}
                onClick={handleConfirmDelete}
              >
                ✓
              </button>
              <button 
                className={styles.confirmNo}
                onClick={handleCancelDelete}
              >
                ✗
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};