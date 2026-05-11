// widgets/pages-workspace/ui/PagesSidebar/PageItem.tsx
import React, { useState, useRef, useEffect } from 'react';
import { CanvasPage } from '@entities/canvas/model/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './PageItem.module.css';

interface PageItemProps {
  page: CanvasPage;
  isActive: boolean;
  isRenaming: boolean;
  onSelect: () => void;
  onRenameStart: () => void;
  onRename: (newName: string) => void;
  onRenameCancel: () => void;
  onDelete: () => void;
}

export const PageItem: React.FC<PageItemProps> = ({
  page,
  isActive,
  isRenaming,
  onSelect,
  onRenameStart,
  onRename,
  onRenameCancel,
  onDelete,
}) => {
  const [name, setName] = useState(page.name);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 🆕 Безопасное получение количества нод
  const getNodeCount = () => {
    // В новой структуре ноды хранятся в canvas, а не в page
    // Возвращаем 0 или другое значение по умолчанию
    return 0; // 🆕 Или можно получить из связанного canvas
  };
  
  const nodeCount = getNodeCount(); // 🆕 Используем безопасный метод
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);
  
  useEffect(() => {
    // Обновляем имя при изменении страницы
    setName(page.name);
  }, [page.name]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onRename(name.trim());
    } else if (e.key === 'Escape') {
      setName(page.name);
      onRenameCancel();
    }
  };
  
  const handleBlur = () => {
    if (isRenaming) {
      onRename(name.trim());
    }
  };
  
  const handleDoubleClick = () => {
    onRenameStart();
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Удалить "${page.name}"?`)) {
      onDelete();
    }
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.pageItem} ${isActive ? styles.active : ''} ${isDragging ? styles.dragging : ''}`}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
    >
      <div 
        className={styles.dragHandle}
        {...attributes}
        {...listeners}
        title="Перетащить для изменения порядка"
      >
        ⋮⋮
      </div>
      
      <div className={styles.pageIcon}>
        📄
      </div>
      
      <div className={styles.pageContent}>
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={styles.renameInput}
            placeholder="Название страницы"
          />
        ) : (
          <div className={styles.pageName}>
            {page.name}
            <span className={styles.nodeCount}>
              ({nodeCount}) {/* 🆕 Используем безопасное значение */}
            </span>
          </div>
        )}
        
        <div className={styles.pageActions}>
          {!isRenaming && (
            <>
              <button
                className={styles.actionButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onRenameStart();
                }}
                title="Переименовать"
              >
                ✏️
              </button>
              <button
                className={styles.actionButton}
                onClick={handleDelete}
                title="Удалить"
                disabled={false} // 🆕 Убираем ограничение
              >
                🗑️
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};