// src/App.tsx
import React from 'react'
import { StoreProvider } from '@app/providers/StoreProvider/StoreProvider'
import { ThemeProvider } from '@app/providers/ThemeProvider/ThemeProvider'
import { DndProvider } from '@app/providers/DndProvider/DndProvider'
import { WorkspaceLayout } from './widgets/workspace-layout/ui/WorkspaceLayout'
import { CanvasWorkspace } from './widgets/canvas-workspace/ui/CanvasWorkspace'
import { CanvasToolbar } from './features/canvas-toolbar/ui/CanvasToolbar'
import { PropertiesPanel } from './features/properties-panel/ui/PropertiesPanel'
import './App.css'

export const App: React.FC = () => {
  return (
    <StoreProvider>
      <ThemeProvider>
        <DndProvider>
          <WorkspaceLayout
            toolbar={<CanvasToolbar />}
            sidebar={<PropertiesPanel />}
          >
            <CanvasWorkspace />
          </WorkspaceLayout>
        </DndProvider>
      </ThemeProvider>
    </StoreProvider>
  )
}