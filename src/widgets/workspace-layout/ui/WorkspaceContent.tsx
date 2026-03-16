// src/widgets/workspace-layout/ui/WorkspaceContent.tsx
import React from 'react';
import { WorkspaceLayout } from './WorkspaceLayout';
import { CanvasWorkspace } from '@widgets/canvas-workspace/ui/CanvasWorkspace';
import { CanvasToolbar } from '@features/canvas-toolbar/ui/CanvasToolbar';
import { PropertiesPanel } from '@features/properties-panel/ui/PropertiesPanel';

const WorkspaceContent: React.FC = () => {
  return (
    <WorkspaceLayout
      toolbar={<CanvasToolbar />}
      sidebar={<PropertiesPanel />}
    >
      <CanvasWorkspace />
    </WorkspaceLayout>
  );
};

export default WorkspaceContent;