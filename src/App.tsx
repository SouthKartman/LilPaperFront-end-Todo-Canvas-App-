// src/app/App.tsx
import React from 'react';
import { StoreProvider } from '@app/providers/StoreProvider/StoreProvider';
import { ThemeProvider } from '@app/providers/ThemeProvider/ThemeProvider';
import { DndProvider } from '@app/providers/DndProvider/DndProvider';
import { AppModalProvider } from '@shared/ui/kit/Modal/AppModal';
import { AppInitializer } from '@shared/ui/kit/AppInitializer/AppInitializer';
import { AppRouterProvider } from '@app/providers/RouterProvider/RouterProvider';
import { SWUpdateNotification } from '@shared/ui/kit/SWUpdateNotification/SWUpdateNotification';
import './App.css';

// Импортируем Service Worker только в production
if (import.meta.env.PROD) {
  import('./service-worker').then(({ registerServiceWorker }) => {
    registerServiceWorker().then((success) => {
      if (success) {
        console.log('✅ Service Worker зарегистрирован');
      } else {
        console.log('⚠️ Service Worker не зарегистрирован');
      }
    });
  });
}

export const App: React.FC = () => {
  return (
    <>
      {/* Компонент уведомления об обновлении */}
      <SWUpdateNotification />

      <StoreProvider>
        <ThemeProvider>
          <DndProvider>
            <AppModalProvider>
              <AppInitializer>
                <AppRouterProvider />
              </AppInitializer>
            </AppModalProvider>
          </DndProvider>
        </ThemeProvider>
      </StoreProvider>
    </>
  );
};