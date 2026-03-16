// src/app/App.tsx
import React from 'react';
import { StoreProvider } from '@app/providers/StoreProvider/StoreProvider';
import { ThemeProvider } from '@app/providers/ThemeProvider/ThemeProvider';
import { DndProvider } from '@app/providers/DndProvider/DndProvider';
import { AppModalProvider } from '@shared/ui/kit/Modal/AppModal';
import { AppInitializer } from '@shared/ui/kit/AppInitializer/AppInitializer';
import { AppRouterProvider } from '@app/providers/RouterProvider/RouterProvider'; // 👈 импортируем компонент
import './App.css';



export const App: React.FC = () => {
  return (
    <StoreProvider>
      <ThemeProvider>
        <DndProvider>
          <AppModalProvider>
            <AppInitializer>
              <AppRouterProvider /> {/* 👈 используем компонент */}
            </AppInitializer>
          </AppModalProvider>
        </DndProvider>
      </ThemeProvider>
    </StoreProvider>
  );
};