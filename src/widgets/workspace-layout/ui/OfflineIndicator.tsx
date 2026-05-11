// src/widgets/workspace-layout/ui/OfflineIndicator.tsx
import { useEffect, useState } from 'react';
import { useOfflineReady } from '@features/storage/lib/useOfflineReady';

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { isOfflineReady } = useOfflineReady();
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (isOnline) return null;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: 20,
      padding: '8px 16px',
      background: isOfflineReady ? '#4CAF50' : '#FF9800',
      color: 'white',
      borderRadius: 20,
      fontSize: 14,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      zIndex: 9999,
    }}>
      {isOfflineReady ? '📱 Офлайн-режим активен' : '⚠️ Загрузка офлайн-режима...'}
    </div>
  );
};