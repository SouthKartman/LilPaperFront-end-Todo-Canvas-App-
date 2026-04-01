// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App.tsx'
import './App.css'
import { registerServiceWorker } from './service-worker';

// Регистрируем Service Worker (не блокирует рендеринг)
if (import.meta.env.PROD) {
  registerServiceWorker().then(success => {
    if (success) {
      console.log('✅ Service Worker зарегистрирован');
    } else {
      console.log('⚠️ Service Worker не зарегистрирован');
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
