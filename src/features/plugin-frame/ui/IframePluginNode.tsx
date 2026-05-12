import React, { useState, memo, useCallback, useRef, useEffect, useMemo } from 'react';
import { PluginComponentProps } from '@entities/plugin-node/model/types';
import './IframePluginNode.css';

// Отдельный компонент для iframe, который не будет перерендериваться
const IframeContent = memo(({ src, title, onLoad, onError }: { 
  src: string; 
  title: string; 
  onLoad: () => void; 
  onError: () => void;
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Используем ref для хранения актуальных колбэков
  const callbacksRef = useRef({ onLoad, onError });
  useEffect(() => {
    callbacksRef.current = { onLoad, onError };
  }, [onLoad, onError]);
  
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    callbacksRef.current.onLoad();
  }, []);
  
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    callbacksRef.current.onError();
  }, []);
  
  // Мемоизируем iframe, чтобы он не пересоздавался
  const iframeElement = useMemo(() => (
    <iframe
      ref={iframeRef}
      src={src}
      title={title}
      sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
      allow="fullscreen; clipboard-read; clipboard-write"
      loading="lazy"
      onLoad={handleLoad}
      onError={handleError}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: hasError ? 'none' : 'block',
        opacity: isLoading ? 0 : 1,
      }}
    />
  ), [src, title, handleLoad, handleError, isLoading, hasError]);
  
  return (
    <>
      {isLoading && (
        <div className="iframe-loader">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      )}
      {hasError && (
        <div className="iframe-error">
          <div className="error-icon">🔒</div>
          <div className="error-message">
            <strong>Сайт запрещает встраивание</strong>
            <p>Сайт имеет политику безопасности, которая не позволяет отображать его во встроенном окне (iframe).</p>
          </div>
          <div className="iframe-error-actions">
            <button onClick={() => window.open(src, '_blank')} className="btn-primary">
              Открыть в новой вкладке
            </button>
          </div>
        </div>
      )}
      {iframeElement}
    </>
  );
});

IframeContent.displayName = 'IframeContent';

// Разделяем компонент на части для оптимизации
const IframeHeader = memo(({ title, onReload, onEdit, onDelete, isDragging }: any) => (
  <div className="iframe-plugin-header-white">
    <div className="iframe-plugin-title-white" title={title}>
      <span className="iframe-plugin-icon">🌐</span>
      {title}
    </div>
    <div className="iframe-plugin-controls-white">
      <button onClick={onReload} className="iframe-btn-white" title="Reload">↻</button>
      <button onClick={onEdit} className="iframe-btn-white" title="Edit URL">✎</button>
      {onDelete && (
        <button onClick={onDelete} className="iframe-btn-white iframe-btn-danger-white">×</button>
      )}
    </div>
  </div>
));

const DragPreview = memo((({ title }: { title: string }) => (
  <div className="iframe-drag-preview">
    <div className="iframe-drag-icon">🌐</div>
    <div className="iframe-drag-url">{title}</div>
  </div>
)));

const ResizeHandle = memo((({ onResizeStart }: { onResizeStart: (e: React.MouseEvent) => void }) => (
  <div className="iframe-resize-handle iframe-resize-se" onMouseDown={onResizeStart} />
)));

export const IframePluginNode: React.FC<PluginComponentProps> = memo(({
  node,
  isSelected,
  isDragging = false,
  onUpdate,
  onResize,
  onDelete,
  onDragStart,
  onClick,
  onDoubleClick,
  onContextMenu,
}) => {
  const isNewNode = !node.pluginProps?.src || node.pluginProps?.src === 'https://example.com' || node.pluginProps?.src === '';
  
  const [isUrlEditorOpen, setIsUrlEditorOpen] = useState(isNewNode);
  const [tempUrl, setTempUrl] = useState(node.pluginProps?.src || 'https://');
  const [isResizing, setIsResizing] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(node.pluginProps?.src || 'https://');
  const [isReloading, setIsReloading] = useState(false);
  
  const resizeStateRef = useRef({ startPos: { x: 0, y: 0 }, startSize: { width: 0, height: 0 } });
  const inputRef = useRef<HTMLInputElement>(null);
  const iframeKeyRef = useRef(Date.now());

  // Вставка из буфера
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
      setTempUrl(pastedText);
    }
    return false;
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const activeElement = document.activeElement;
        if (activeElement === inputRef.current) {
          e.preventDefault();
          e.stopPropagation();
          navigator.clipboard.readText().then(text => {
            if (text) setTempUrl(text);
          }).catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, []);

  // Блокировка масштабирования при зажатом Ctrl
  useEffect(() => {
    const iframe = document.querySelector(`iframe[data-key="${iframeKeyRef.current}"]`) as HTMLIFrameElement;
    if (!iframe) return;
    
    let timeoutId: NodeJS.Timeout;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        iframe.style.pointerEvents = 'none';
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (!(e.ctrlKey || e.metaKey)) {
            iframe.style.pointerEvents = 'auto';
          }
        }, 100);
      }
    };
    
    const handleKeyUp = () => {
      iframe.style.pointerEvents = 'auto';
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearTimeout(timeoutId);
    };
  }, [currentUrl]);

  const handleUrlSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (tempUrl?.trim()) {
      let finalUrl = tempUrl.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
      setCurrentUrl(finalUrl);
      iframeKeyRef.current = Date.now(); // Меняем key для пересоздания iframe
      onUpdate({
        pluginProps: { ...node.pluginProps, src: finalUrl },
        title: finalUrl,
        updatedAt: Date.now(),
      });
      setIsUrlEditorOpen(false);
    }
  }, [tempUrl, node.pluginProps, onUpdate]);

  const handleReload = useCallback(() => {
    setIsReloading(true);
    iframeKeyRef.current = Date.now();
    setTimeout(() => setIsReloading(false), 500);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsUrlEditorOpen(false);
      if (isNewNode && onDelete) onDelete();
      else setTempUrl(currentUrl);
    }
  }, [isNewNode, onDelete, currentUrl]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('.iframe-btn-white') || 
                          target.closest('button') || 
                          target.closest('input') ||
                          target.closest('.iframe-resize-handle');
    
    if (isInteractive) return;
    
    e.stopPropagation();
    onClick?.(e);
    
    if (onDragStart && !isUrlEditorOpen && !isResizing) {
      onDragStart(e);
    }
  }, [onClick, onDragStart, isUrlEditorOpen, isResizing]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStateRef.current = {
      startPos: { x: e.clientX, y: e.clientY },
      startSize: { width: node.width, height: node.height }
    };
  }, [node.width, node.height]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !onResize) return;

    const { startPos, startSize } = resizeStateRef.current;
    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;
    
    const newWidth = Math.max(300, Math.min(1200, startSize.width + dx));
    const newHeight = Math.max(200, Math.min(900, startSize.height + dy));

    onResize(newWidth, newHeight);
  }, [isResizing, onResize]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const displayTitle = node.title || currentUrl || 'Website Embed';

  // Новая нода - показываем редактор
  if (isNewNode && isUrlEditorOpen) {
    return (
      <div 
        className={`iframe-plugin-node iframe-plugin-node-editing ${isSelected ? 'selected' : ''}`}
        style={{ width: node.width, height: node.height }}
        onMouseDown={handleMouseDown} 
        onDoubleClick={onDoubleClick} 
        onContextMenu={onContextMenu}
      >
        <IframeHeader title="Новая веб-страница" onDelete={onDelete} />
        <form onSubmit={handleUrlSubmit} className="iframe-url-editor-inline" onClick={(e) => e.stopPropagation()}>
          <div className="iframe-url-editor-icon">🌐</div>
          <input 
            ref={inputRef}
            type="text" 
            value={tempUrl} 
            onChange={(e) => setTempUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Введите URL сайта" 
            autoFocus 
            className="iframe-url-input" 
          />
          <button type="submit" className="iframe-btn-submit" disabled={!tempUrl.trim()}>
            Открыть сайт
          </button>
        </form>
      </div>
    );
  }

  return (
    <div 
      className={`iframe-plugin-node ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{ 
        width: node.width, 
        height: node.height, 
        cursor: isDragging ? 'grabbing' : 'grab' 
      }}
      onMouseDown={handleMouseDown} 
      onDoubleClick={onDoubleClick} 
      onContextMenu={onContextMenu}
    >
      <IframeHeader 
        title={displayTitle} 
        onReload={handleReload} 
        onEdit={() => setIsUrlEditorOpen(true)} 
        onDelete={onDelete} 
        isDragging={isDragging} 
      />

      {isUrlEditorOpen && (
        <form onSubmit={handleUrlSubmit} className="iframe-url-editor">
          <input 
            ref={inputRef}
            type="text" 
            value={tempUrl} 
            onChange={(e) => setTempUrl(e.target.value)}
            onPaste={handlePaste}
            placeholder="https://" 
            autoFocus 
          />
          <button type="submit">Load</button>
          <button type="button" onClick={() => setIsUrlEditorOpen(false)}>Cancel</button>
        </form>
      )}
      
      <div className="iframe-plugin-content">
        {isDragging ? (
          <DragPreview title={displayTitle} />
        ) : (
          <IframeContent 
            key={iframeKeyRef.current}
            src={currentUrl} 
            title={displayTitle}
            onLoad={() => {}}
            onError={() => {}}
          />
        )}
      </div>
      
      {onResize && !isDragging && <ResizeHandle onResizeStart={handleResizeStart} />}
    </div>
  );
});

IframePluginNode.displayName = 'IframePluginNode';