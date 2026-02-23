import React from 'react';
import { StoreProvider } from '@app/providers/StoreProvider/StoreProvider';
import { ThemeProvider } from '@app/providers/ThemeProvider/ThemeProvider';
import { DndProvider } from '@app/providers/DndProvider/DndProvider';
import { WorkspaceLayout } from '@widgets/workspace-layout/ui/WorkspaceLayout';
import { CanvasWorkspace } from '@widgets/canvas-workspace/ui/CanvasWorkspace';
import { CanvasToolbar } from '@features/canvas-toolbar/ui/CanvasToolbar';
import { PropertiesPanel } from '@features/properties-panel/ui/PropertiesPanel';
import { ContextMenu } from '@features/node-creations/ui/ContextMenu';
import { TodoFormModal } from '@features/todo-form/ui/TodoFormModal';
import { AppModalProvider } from '@shared/ui/kit/Modal/AppModal';
import { KonvaCanvasWorkspace } from '@widgets/canvas-workspace/ui/KonvaCanvasWorkspace';
import { AppInitializer } from '@shared/ui/kit/AppInitializer/AppInitializer';
import './App.css';

// Внутренний компонент с основным контентом
const MainContent: React.FC = () => {
  return (
    <>
      {/* Глобальное контекстное меню - вне WorkspaceLayout чтобы было поверх всего */}
      <ContextMenu />
      
      {/* Модальное окно формы создания задач - также поверх всего */}
      <TodoFormModal />
      
      <WorkspaceLayout
        toolbar={<CanvasToolbar />}
        sidebar={<PropertiesPanel />}
      >
        <CanvasWorkspace />
        {/* <KonvaCanvasWorkspace/> */}
      </WorkspaceLayout>
    </>
  );
};

// Главный компонент App
export const App: React.FC = () => {
  return (
    <StoreProvider>
      <ThemeProvider>
        <DndProvider>
          <AppModalProvider>
            <AppInitializer>
              <MainContent />
            </AppInitializer>
          </AppModalProvider>
        </DndProvider>
      </ThemeProvider>
    </StoreProvider>
  );
};