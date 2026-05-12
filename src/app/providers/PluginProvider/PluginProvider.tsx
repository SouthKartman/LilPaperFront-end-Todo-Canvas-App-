import React, { useEffect } from 'react';
import { PluginRegistry } from '@entities/plugin-node/model/pluginRegistry';
import { IframePluginNode } from '@features/plugin-frame/ui/IframePluginNode';

export const PluginProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    console.log('🔵 PluginProvider mounting...');
    
    // Проверяем, зарегистрирован ли уже плагин
    if (!PluginRegistry.hasPlugin('iframe/website')) {
      console.log('🔵 Registering iframe plugin...');
      
      PluginRegistry.register({
        id: 'iframe/website',
        type: 'iframe',
        name: 'Веб-страница',
        icon: '🌐',
        defaultSize: { width: 800, height: 600 },
        minSize: { width: 300, height: 200 },
        maxSize: { width: 1200, height: 900 },
        component: IframePluginNode,
        getDefaultProps: () => ({
          src: '',
          sandbox: 'allow-same-origin allow-scripts allow-popups allow-forms allow-modals',
          allow: 'fullscreen; clipboard-read; clipboard-write',
          loading: 'lazy',
        }),
      });
      
      console.log('✅ Iframe plugin registered!');
      console.log('All plugins:', PluginRegistry.getAllPlugins());
    } else {
      console.log('ℹ️ Iframe plugin already registered');
    }
  }, []);
  
  return <>{children}</>;
};