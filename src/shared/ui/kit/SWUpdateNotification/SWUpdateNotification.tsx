// src/shared/ui/SWUpdateNotification/SWUpdateNotification.tsx
import React, { useEffect, useState } from 'react';
import './SWUpdateNotification.css';

export const SWUpdateNotification: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = () => {
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className="sw-update-notification">
      <span>📦 Доступна новая версия приложения</span>
      <button onClick={handleUpdate}>Обновить</button>
    </div>
  );
};