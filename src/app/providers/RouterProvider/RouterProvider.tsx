// src/app/providers/RouterProvider/RouterProvider.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Suspense } from 'react';
import { ProjectsPage } from '@pages/projects';
import { WorkspaceLayout } from '@widgets/workspace-layout/ui/WorkspaceLayout';
import { CanvasWorkspace } from '@widgets/canvas-workspace/ui/CanvasWorkspace';
import { CanvasToolbar } from '@features/canvas-toolbar/ui/CanvasToolbar';
import { PropertiesPanel } from '@features/properties-panel/ui/PropertiesPanel';
import { ContextMenu } from '@features/node-creations/ui/ContextMenu';
import { TodoFormModal } from '@features/todo-form/ui/TodoFormModal';

// Компонент-обертка для рабочей области
const WorkspaceRoute = () => {
  return (
    <>
      <ContextMenu />
      <TodoFormModal />
      <WorkspaceLayout
        toolbar={<CanvasToolbar />}
        sidebar={<PropertiesPanel />}
      >
        <Suspense fallback={<div>Загрузка холста...</div>}>
          <CanvasWorkspace />
        </Suspense>
      </WorkspaceLayout>
    </>
  );
};

// Создаем и экспортируем router
export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProjectsPage />,
  },
  {
    path: '/projects',
    element: <ProjectsPage />,
  },
  {
    path: '/project/:projectId',
    element: <WorkspaceRoute />,
  },
  {
    path: '/project/:projectId/page/:pageId',
    element: <WorkspaceRoute />,
  },
]);

// Компонент-провайдер
export const AppRouterProvider = () => {
  return <RouterProvider router={router} />;
};