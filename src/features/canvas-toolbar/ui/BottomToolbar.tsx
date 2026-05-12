import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addPluginNode } from '@features/plugin-nodes/model/slice';
import { PluginRegistry } from '@entities/plugin-node/model/pluginRegistry';
import { nanoid } from 'nanoid';
import { RootState } from '@shared/lib/state/store';
import { selectCurrentPage } from '@features/project-management/model/selectors';
import './BottomToolbar.css';

interface BottomToolbarProps {
  onAddIframe?: (url: string) => void;
  getCenterPosition?: () => { x: number; y: number };
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({ onAddIframe, getCenterPosition }) => {
  const dispatch = useDispatch();
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const currentPage = useSelector(selectCurrentPage);
  const viewport = useSelector((state: RootState) => state.viewport);

  const getCenterCoordinates = () => {
    if (getCenterPosition) {
      return getCenterPosition();
    }
    
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    if (viewport) {
      const canvasX = (centerX - viewport.position.x) / viewport.scale;
      const canvasY = (centerY - viewport.position.y) / viewport.scale;
      return { x: canvasX, y: canvasY };
    }
    
    return { x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 300 };
  };

  const handleAddIframe = () => {
    setShowUrlInput(true);
    setTempUrl('');
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tempUrl.trim()) return;
    
    let finalUrl = tempUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    
    const plugin = PluginRegistry.getPlugin('iframe/website');
    console.log('Plugin found:', plugin);
    
    if (plugin) {
      setIsCreating(true);
      
      const centerPos = getCenterCoordinates();
      console.log('Center position:', centerPos);
      console.log('Current page:', currentPage?.id);
      
      const newNode = {
        id: nanoid(),
        pluginId: plugin.id,
        type: plugin.type,
        title: finalUrl,
        width: plugin.defaultSize.width,
        height: plugin.defaultSize.height,
        position: { x: centerPos.x - plugin.defaultSize.width / 2, y: centerPos.y - plugin.defaultSize.height / 2 },
        pageId: currentPage?.id || 'default',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pluginProps: {
          src: finalUrl,
          sandbox: 'allow-same-origin allow-scripts allow-popups allow-forms allow-modals',
          allow: 'fullscreen; clipboard-read; clipboard-write',
          loading: 'lazy',
        },
      };
      
      console.log('Creating node:', newNode);
      dispatch(addPluginNode(newNode));
      onAddIframe?.(finalUrl);
      
      setShowUrlInput(false);
      setTempUrl('');
      setIsCreating(false);
    } else {
      console.error('Plugin iframe/website not found!');
    }
  };

  const handleCancel = () => {
    setShowUrlInput(false);
    setTempUrl('');
  };

  return (
    <>
      <div className="bottom-toolbar">
        <div className="toolbar-container">
          <button
            className="toolbar-btn"
            onClick={handleAddIframe}
            disabled={isCreating}
            title="Добавить веб-страницу"
          >
            <span className="toolbar-btn-icon">🌐</span>
            {/* <span className="toolbar-btn-label">Сайт</span> */}
          </button>
        </div>
      </div>

      {showUrlInput && (
        <div className="url-modal">
          <div className="url-modal-overlay" onClick={handleCancel} />
          <div className="url-modal-content">
            <div className="url-modal-header">
              <span className="url-modal-icon">🌐</span>
              <h3>Добавить веб-страницу</h3>
              <button className="url-modal-close" onClick={handleCancel}>×</button>
            </div>
            
            <form onSubmit={handleUrlSubmit}>
              <div className="url-modal-body">
                <label>Введите URL сайта:</label>
                <input
                  type="url"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  placeholder="https://example.com"
                  autoFocus
                />
              </div>
              
              <div className="url-modal-footer">
                <button type="button" onClick={handleCancel} className="btn-cancel">
                  Отмена
                </button>
                <button type="submit" className="btn-submit" disabled={!tempUrl.trim()}>
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};