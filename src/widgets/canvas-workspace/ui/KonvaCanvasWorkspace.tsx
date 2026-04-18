// import React, { useRef, useCallback, useEffect, useState } from 'react';
// import { Stage, Layer, Rect } from 'react-konva';
// import { useSelector, useDispatch } from 'react-redux';
// import { KonvaTodoNode } from '@features/todo-nodes/ui/TodoNode/KonvaTodoNode';
// import { GridRenderer } from '@features/canvas-viewport/ui/GridRenderer';
// import { ContextMenu } from "@features/node-creations/ui/ContextMenu";
// import { QuickTodoForm } from '@features/todo-form/ui/QuickTodoForm';
// import { TodoFormModal } from '@features/todo-form/ui/TodoFormModal';
// import { 
//   zoomIn, 
//   zoomOut, 
//   panStart, 
//   panMove, 
//   panEnd,
//   resetViewport,
//   zoomToPoint,
//   setPosition,
//   fitToContent,
//   toggleGrid,
// } from '@features/canvas-viewport/model/slice';
// import { 
//   selectNode, 
//   deselectNode, 
//   clearSelection,
//   moveTodo,
//   createTodoAtPosition,
//   startEditingTodo,
//   deleteTodo,
//   duplicateTodo,
// } from '@features/todo-nodes/model/slice';
// import { showMenu } from '@features/node-creations/model/slice';
// import { createCanvasContextMenu, createNodeContextMenu } from '@features/node-creations/lib/contextMenuHelpers';
// import { selectAllTodoNodes, selectSelectedTodoNodes } from '@features/todo-nodes/model/selectors';
// import { 
//   selectViewport, 
//   selectScreenToCanvas,
//   selectSnapPosition 
// } from '@features/canvas-viewport/model/selectors';
// import { openQuickForm } from '@features/todo-form/model/slice';
// import { useCanvasDnd } from '@features/canvas-dnd/lib/useCanvasDnd';
// import styles from './KonvaCanvasWorkspace.module.css';

// export const KonvaCanvasWorkspace: React.FC = () => {
//   const dispatch = useDispatch();
//   const stageRef = useRef<any>(null);
//   const containerRef = useRef<HTMLDivElement>(null);
//   const isPanning = useRef(false);
//   const lastPos = useRef({ x: 0, y: 0 });
//   const isSpacePressed = useRef(false);
//   const zoomPopupRef = useRef<HTMLDivElement>(null);
  
//   const nodes = useSelector(selectAllTodoNodes);
//   const selectedNodes = useSelector(selectSelectedTodoNodes);
//   const viewport = useSelector(selectViewport);
//   const screenToCanvas = useSelector(selectScreenToCanvas);
//   const snapPosition = useSelector(selectSnapPosition);
//   const { dragState, isDragging } = useCanvasDnd();
  
//   const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
//   const [isZoomPopupOpen, setIsZoomPopupOpen] = useState(false);
//   const [showHotkeyHint, setShowHotkeyHint] = useState(true);
  
//   // Обновление размера контейнера
//   useEffect(() => {
//     const updateSize = () => {
//       if (containerRef.current) {
//         const { width, height } = containerRef.current.getBoundingClientRect();
//         setContainerSize({ width, height });
//       }
//     };
    
//     updateSize();
//     const resizeObserver = new ResizeObserver(updateSize);
//     if (containerRef.current) {
//       resizeObserver.observe(containerRef.current);
//     }
    
//     window.addEventListener('resize', updateSize);
    
//     return () => {
//       resizeObserver.disconnect();
//       window.removeEventListener('resize', updateSize);
//     };
//   }, []);
  
//   // Обработчик колеса мыши для зума
//   const handleWheel = useCallback((e: any) => {
//     e.evt.preventDefault();
    
//     if (e.evt.ctrlKey || e.evt.metaKey) {
//       // Zoom с Ctrl/Cmd
//       const delta = e.evt.deltaY > 0 ? 0.8 : 1.2;
//       const stage = e.target.getStage();
//       const pointer = stage.getPointerPosition();
      
//       dispatch(zoomToPoint({ 
//         point: pointer, 
//         targetScale: viewport.scale * delta 
//       }));
//     } else {
//       // Панорамирование
//       const stage = e.target.getStage();
//       const newPos = {
//         x: stage.x() - e.evt.deltaX,
//         y: stage.y() - e.evt.deltaY,
//       };
      
//       stage.position(newPos);
//       dispatch(setPosition(newPos));
//     }
//   }, [dispatch, viewport.scale]);
  
//   // Обработчики панорамирования
//   const handleMouseDown = useCallback((e: any) => {
//     const stage = e.target.getStage();
    
//     // Средняя кнопка мыши или пробел + левая кнопка
//     if (e.evt.button === 1 || (e.evt.button === 0 && isSpacePressed.current)) {
//       isPanning.current = true;
//       lastPos.current = { x: e.evt.clientX, y: e.evt.clientY };
//       dispatch(panStart());
//       stage.container().style.cursor = 'grabbing';
//     }
//   }, [dispatch]);
  
//   const handleMouseMove = useCallback((e: any) => {
//     if (!isPanning.current || !stageRef.current) return;
    
//     const delta = {
//       x: e.evt.clientX - lastPos.current.x,
//       y: e.evt.clientY - lastPos.current.y,
//     };
    
//     const stage = stageRef.current;
//     const newPos = {
//       x: stage.x() + delta.x,
//       y: stage.y() + delta.y,
//     };
    
//     stage.position(newPos);
//     lastPos.current = { x: e.evt.clientX, y: e.evt.clientY };
//     dispatch(panMove({ delta }));
//   }, [dispatch]);
  
//   const handleMouseUp = useCallback(() => {
//     if (isPanning.current) {
//       isPanning.current = false;
//       dispatch(panEnd());
//       if (stageRef.current) {
//         stageRef.current.container().style.cursor = '';
//       }
//     }
//   }, [dispatch]);
  
//   // Обработчик клика по канвасу
//   const handleStageClick = useCallback((e: any) => {
//     const stage = e.target.getStage();
    
//     // Если кликнули по пустому месту (не по ноде)
//     if (e.target === stage) {
//       if (!e.evt.ctrlKey && !e.evt.metaKey && !e.evt.shiftKey) {
//         dispatch(clearSelection());
//       }
//       setIsZoomPopupOpen(false);
//     }
//   }, [dispatch]);
  
//   // Обработчик двойного клика по канвасу
//   const handleStageDoubleClick = useCallback((e: any) => {
//     if (e.target === e.currentTarget) {
//       const stage = e.target.getStage();
//       const pointer = stage.getPointerPosition();
//       const canvasPos = screenToCanvas(pointer);
//       const snappedPos = snapPosition(canvasPos);
      
//       dispatch(openQuickForm({ position: snappedPos }));
//     }
//   }, [dispatch, screenToCanvas, snapPosition]);
  
//   // Обработчик контекстного меню канваса
//   const handleContextMenu = useCallback((e: any) => {
//     e.evt.preventDefault();
    
//     const stage = e.target.getStage();
//     const pointer = stage.getPointerPosition();
//     const canvasPos = screenToCanvas(pointer);
    
//     const menuItems = createCanvasContextMenu(canvasPos);
    
//     dispatch(showMenu({
//       x: e.evt.clientX,
//       y: e.evt.clientY,
//       items: menuItems,
//       context: { position: canvasPos },
//     }));
//   }, [dispatch, screenToCanvas]);
  
//   // Обработчики для нод
//   const handleNodeSelect = useCallback((nodeId: string, multiSelect?: boolean) => {
//     if (multiSelect) {
//       const isSelected = selectedNodes.some(n => n.id === nodeId);
//       if (isSelected) {
//         dispatch(deselectNode(nodeId));
//       } else {
//         dispatch(selectNode(nodeId));
//       }
//     } else {
//       dispatch(clearSelection());
//       dispatch(selectNode(nodeId));
//     }
//     setIsZoomPopupOpen(false);
//   }, [dispatch, selectedNodes]);
  
//   const handleNodeDoubleClick = useCallback((nodeId: string) => {
//     dispatch(startEditingTodo(nodeId));
//   }, [dispatch]);
  
//   const handleNodeContextMenu = useCallback((nodeId: string, position: { x: number; y: number }) => {
//     const menuItems = createNodeContextMenu();
    
//     dispatch(showMenu({
//       x: position.x,
//       y: position.y,
//       items: menuItems,
//       context: { nodeId },
//     }));
//   }, [dispatch]);
  
//   const handleNodeDragMove = useCallback((nodeId: string, position: { x: number; y: number }) => {
//     const snappedPos = snapPosition(position);
//     dispatch(moveTodo({ id: nodeId, position: snappedPos }));
//   }, [dispatch, snapPosition]);
  
//   const handleNodeDragEnd = useCallback((nodeId: string, position: { x: number; y: number }) => {
//     const snappedPos = snapPosition(position);
//     dispatch(moveTodo({ id: nodeId, position: snappedPos }));
//   }, [dispatch, snapPosition]);
  
//   // Обработчики горячих клавиш
//   useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       // Пробел для панорамирования
//       if (e.code === 'Space') {
//         isSpacePressed.current = true;
//         if (stageRef.current) {
//           stageRef.current.container().style.cursor = 'grab';
//         }
//         e.preventDefault();
//       }
      
//       // Ctrl + = для зума увеличения
//       if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
//         e.preventDefault();
//         dispatch(zoomIn({}));
//       }
      
//       // Ctrl + - для зума уменьшения
//       if ((e.ctrlKey || e.metaKey) && e.key === '-') {
//         e.preventDefault();
//         dispatch(zoomOut({}));
//       }
      
//       // Ctrl + 0 для сброса
//       if ((e.ctrlKey || e.metaKey) && e.key === '0') {
//         e.preventDefault();
//         dispatch(resetViewport());
//       }
      
//       // F для вписывания всех задач
//       if (e.key === 'f' || e.key === 'а') { // 'а' для русской раскладки
//         e.preventDefault();
        
//         if (nodes.length === 0) {
//           dispatch(resetViewport());
//           return;
//         }
        
//         let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
//         nodes.forEach(node => {
//           const x = node.position.x;
//           const y = node.position.y;
//           const width = node.size?.width || 280;
//           const height = node.size?.height || 180;
          
//           minX = Math.min(minX, x);
//           minY = Math.min(minY, y);
//           maxX = Math.max(maxX, x + width);
//           maxY = Math.max(maxY, y + height);
//         });
        
//         const bounds = {
//           x: minX,
//           y: minY,
//           width: maxX - minX,
//           height: maxY - minY,
//         };
        
//         dispatch(fitToContent({ 
//           bounds, 
//           viewportSize: containerSize 
//         }));
//       }
      
//       // Ctrl + G для переключения сетки
//       if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
//         e.preventDefault();
//         dispatch(toggleGrid());
//       }
      
//       // Delete для удаления выделенных
//       if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodes.length > 0) {
//         e.preventDefault();
//         if (window.confirm(`Удалить ${selectedNodes.length} задач?`)) {
//           selectedNodes.forEach(node => {
//             dispatch(deleteTodo(node.id));
//           });
//         }
//       }
      
//       // Ctrl + D для дублирования
//       if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedNodes.length > 0) {
//         e.preventDefault();
//         selectedNodes.forEach(node => {
//           dispatch(duplicateTodo(node.id));
//         });
//       }
      
//       // Ctrl + A для выделения всех
//       if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
//         e.preventDefault();
//         nodes.forEach(node => {
//           dispatch(selectNode(node.id));
//         });
//       }
      
//       // Escape для снятия выделения
//       if (e.key === 'Escape') {
//         dispatch(clearSelection());
//         setIsZoomPopupOpen(false);
//       }
      
//       // Ctrl + H для создания ноды в центре
//       if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
//         e.preventDefault();
//         const centerX = containerSize.width / 2 / viewport.scale - viewport.position.x / viewport.scale;
//         const centerY = containerSize.height / 2 / viewport.scale - viewport.position.y / viewport.scale;
        
//         dispatch(createTodoAtPosition({
//           position: { x: centerX, y: centerY },
//           title: 'Новая задача',
//           priority: 'medium',
//         }));
//       }
//     };
    
//     const handleKeyUp = (e: KeyboardEvent) => {
//       if (e.code === 'Space') {
//         isSpacePressed.current = false;
//         if (stageRef.current && !isPanning.current) {
//           stageRef.current.container().style.cursor = '';
//         }
//         e.preventDefault();
//       }
//     };
    
//     window.addEventListener('keydown', handleKeyDown);
//     window.addEventListener('keyup', handleKeyUp);
    
//     return () => {
//       window.removeEventListener('keydown', handleKeyDown);
//       window.removeEventListener('keyup', handleKeyUp);
//     };
//   }, [dispatch, nodes, selectedNodes, containerSize, viewport.scale, viewport.position]);
  
//   // Закрытие zoom popup при клике вне
//   useEffect(() => {
//     const handleClickOutside = (e: MouseEvent) => {
//       if (zoomPopupRef.current && !zoomPopupRef.current.contains(e.target as Node)) {
//         setIsZoomPopupOpen(false);
//       }
//     };
    
//     if (isZoomPopupOpen) {
//       document.addEventListener('mousedown', handleClickOutside);
//     }
    
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, [isZoomPopupOpen]);
  
//   // Эффект для глобальных событий мыши
//   useEffect(() => {
//     const handleGlobalMouseMove = (e: MouseEvent) => {
//       if (isPanning.current) {
//         handleMouseMove({ evt: e });
//       }
//     };
    
//     const handleGlobalMouseUp = () => {
//       handleMouseUp();
//     };
    
//     document.addEventListener('mousemove', handleGlobalMouseMove);
//     document.addEventListener('mouseup', handleGlobalMouseUp);
    
//     return () => {
//       document.removeEventListener('mousemove', handleGlobalMouseMove);
//       document.removeEventListener('mouseup', handleGlobalMouseUp);
//     };
//   }, [handleMouseMove, handleMouseUp]);
  
//   // Загружаем состояние viewport в Stage при монтировании
//   useEffect(() => {
//     if (stageRef.current) {
//       stageRef.current.position(viewport.position);
//       stageRef.current.scale({ x: viewport.scale, y: viewport.scale });
//     }
//   }, [viewport.position, viewport.scale]);
  
//   // Скрыть подсказки через 5 секунд
//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setShowHotkeyHint(false);
//     }, 5000);
    
//     return () => clearTimeout(timer);
//   }, []);
  
//   const handleCreateTodoClick = () => {
//     const centerX = containerSize.width / 2 / viewport.scale - viewport.position.x / viewport.scale;
//     const centerY = containerSize.height / 2 / viewport.scale - viewport.position.y / viewport.scale;
    
//     dispatch(openQuickForm({ position: { x: centerX, y: centerY } }));
//   };
  
//   const handleZoomButtonClick = (e: React.MouseEvent) => {
//     e.stopPropagation();
//     setIsZoomPopupOpen(!isZoomPopupOpen);
//   };
  
//   const zoomPresets = [
//     { label: '25%', value: 0.25 },
//     { label: '50%', value: 0.5 },
//     { label: '75%', value: 0.75 },
//     { label: '100%', value: 1 },
//     { label: '150%', value: 1.5 },
//     { label: '200%', value: 2 },
//   ];
  
//   return (
//     <div className={styles.workspace} ref={containerRef}>
//       <div className={styles.canvasGrid} />
      
//       <div className={styles.canvasContainer}>
//         <Stage
//           ref={stageRef}
//           width={containerSize.width}
//           height={containerSize.height}
//           scaleX={viewport.scale}
//           scaleY={viewport.scale}
//           x={viewport.position.x}
//           y={viewport.position.y}
//           onWheel={handleWheel}
//           onMouseDown={handleMouseDown}
//           onMouseUp={handleMouseUp}
//           onClick={handleStageClick}
//           onDblClick={handleStageDoubleClick}
//           onContextMenu={handleContextMenu}
//           className={styles.stage}
//         >
//           {/* Фон */}
//           <Layer listening={false}>
//             <Rect
//               width={containerSize.width}
//               height={containerSize.height}
//               fill="#f8f9fa"
//               listening={false}
//             />
//           </Layer>
          
//           {/* Сетка Konva */}
//           {viewport.showGrid && (
//             <GridRenderer
//               width={containerSize.width}
//               height={containerSize.height}
//               scale={viewport.scale}
//               position={viewport.position}
//               gridSize={40} // Соответствует размеру сетки из старых стилей
//             />
//           )}
          
//           {/* Слой с нодами */}
//           <Layer>
//             {nodes.map((node) => (
//               <KonvaTodoNode
//                 key={node.id}
//                 node={node}
//                 scale={viewport.scale}
//                 isSelected={selectedNodes.some(n => n.id === node.id)}
//                 onSelect={handleNodeSelect}
//                 onDoubleClick={handleNodeDoubleClick}
//                 onContextMenu={handleNodeContextMenu}
//                 onDragMove={handleNodeDragMove}
//                 onDragEnd={handleNodeDragEnd}
//               />
//             ))}
//           </Layer>
//         </Stage>
//       </div>
      
//       {/* Кнопка создания задачи */}
//       <button 
//         onClick={handleCreateTodoClick}
//         className={styles.createTodoButton}
//         title="Создать задачу (Ctrl+H)"
//       >
//         <span className={styles.plusIcon}>+</span>
//         Создать задачу
//       </button>
      
//       {/* Zoom контролы */}
//       <div className={styles.zoomControls}>
//         <button 
//           className={styles.zoomButton}
//           onClick={handleZoomButtonClick}
//           title="Настройки масштаба"
//         >
//           <span className={styles.zoomIcon}>🔍</span>
//           {Math.round(viewport.scale * 100)}%
//           <span className={styles.zoomArrow}>▼</span>
//         </button>
        
//         {isZoomPopupOpen && (
//           <div 
//             ref={zoomPopupRef}
//             className={styles.zoomPopup}
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className={styles.zoomPopupHeader}>
//               <span>Масштаб</span>
//               <button 
//                 className={styles.zoomPopupClose}
//                 onClick={() => setIsZoomPopupOpen(false)}
//               >
//                 ×
//               </button>
//             </div>
            
//             <div className={styles.zoomPopupContent}>
//               <div className={styles.zoomSlider}>
//                 <button 
//                   className={styles.zoomActionButton}
//                   onClick={() => dispatch(zoomOut({}))}
//                   title="Уменьшить (Ctrl+-)"
//                 >
//                   −
//                 </button>
                
//                 <input
//                   type="range"
//                   min={viewport.minScale * 100}
//                   max={viewport.maxScale * 100}
//                   value={viewport.scale * 100}
//                   onChange={(e) => dispatch(setPosition({
//                     scale: parseInt(e.target.value) / 100,
//                     position: viewport.position
//                   }))}
//                   className={styles.zoomSliderInput}
//                 />
                
//                 <button 
//                   className={styles.zoomActionButton}
//                   onClick={() => dispatch(zoomIn({}))}
//                   title="Увеличить (Ctrl+=)"
//                 >
//                   +
//                 </button>
//               </div>
              
//               <div className={styles.zoomValue}>
//                 {Math.round(viewport.scale * 100)}%
//               </div>
              
//               <div className={styles.zoomPresets}>
//                 {zoomPresets.map(preset => (
//                   <button
//                     key={preset.label}
//                     className={`${styles.zoomPresetButton} ${Math.abs(viewport.scale - preset.value) < 0.01 ? styles.active : ''}`}
//                     onClick={() => dispatch(setPosition({
//                       scale: preset.value,
//                       position: viewport.position
//                     }))}
//                   >
//                     {preset.label}
//                   </button>
//                 ))}
//               </div>
              
//               <div className={styles.zoomActions}>
//                 <button
//                   className={styles.zoomResetButton}
//                   onClick={() => dispatch(resetViewport())}
//                 >
//                   Сбросить (100%)
//                 </button>
//                 <button
//                   className={styles.zoomFitButton}
//                   onClick={() => {
//                     if (nodes.length === 0) {
//                       dispatch(resetViewport());
//                       return;
//                     }
                    
//                     let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    
//                     nodes.forEach(node => {
//                       const x = node.position.x;
//                       const y = node.position.y;
//                       const width = node.size?.width || 280;
//                       const height = node.size?.height || 180;
                      
//                       minX = Math.min(minX, x);
//                       minY = Math.min(minY, y);
//                       maxX = Math.max(maxX, x + width);
//                       maxY = Math.max(maxY, y + height);
//                     });
                    
//                     const bounds = {
//                       x: minX,
//                       y: minY,
//                       width: maxX - minX,
//                       height: maxY - minY,
//                     };
                    
//                     dispatch(fitToContent({ 
//                       bounds, 
//                       viewportSize: containerSize 
//                     }));
//                     setIsZoomPopupOpen(false);
//                   }}
//                 >
//                   Вписать всё
//                 </button>
//               </div>
              
//               <div className={styles.zoomGridControls}>
//                 <label className={styles.checkboxLabel}>
//                   <input
//                     type="checkbox"
//                     checked={viewport.showGrid}
//                     onChange={() => dispatch(toggleGrid())}
//                   />
//                   <span>Показывать сетку</span>
//                 </label>
//                 <label className={styles.checkboxLabel}>
//                   <input
//                     type="checkbox"
//                     checked={viewport.snapToGrid}
//                     onChange={() => dispatch(toggleGrid())}
//                   />
//                   <span>Привязка к сетке</span>
//                 </label>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
      
//       {/* Подсказка по горячим клавишам */}
//       {showHotkeyHint && (
//         <div className={styles.hotkeyHint}>
//           <span className={styles.hintIcon}>💡</span>
//           <span className={styles.hintText}>
//             Используйте <kbd>Ctrl</kbd> + <kbd>Колесо</kbd> для масштаба, <kbd>Пробел</kbd> + <kbd>ЛКМ</kbd> для панорамирования
//           </span>
//           <button 
//             className={styles.hintClose}
//             onClick={() => setShowHotkeyHint(false)}
//           >
//             ×
//           </button>
//         </div>
//       )}
      
//       {/* Индикатор выбора */}
//       {selectedNodes.length > 0 && (
//         <div className={styles.selectionHint}>
//           Выбрано: {selectedNodes.length} задач
//           {selectedNodes.length === 1 && (
//             <span className={styles.singleSelection}>
//               • {selectedNodes[0].title}
//             </span>
//           )}
//         </div>
//       )}
      
//       {/* Индикатор сетки */}
//       {viewport.snapToGrid && (
//         <div className={styles.gridSnapIndicator} title="Привязка к сетке включена">
//           📐
//         </div>
//       )}
      
//       {/* Индикатор перетаскивания */}
//       {isDragging && dragState?.draggedNodeId && (
//         <div
//           className={styles.dragPreview}
//           style={{
//             left: dragState.currentPosition.x - dragState.offset.x,
//             top: dragState.currentPosition.y - dragState.offset.y,
//           }}
//         >
//           <div className={styles.dragPreviewContent}>
//             <span className={styles.dragIcon}>↕️</span>
//             Перемещение...
//           </div>
//         </div>
//       )}
      
//       {/* Контекстное меню */}
//       <ContextMenu />
      
//       {/* Быстрая форма создания задачи */}
//       <QuickTodoForm />
      
//       {/* Модальное окно с полной формой */}
//       <TodoFormModal />
//     </div>
//   );
// };