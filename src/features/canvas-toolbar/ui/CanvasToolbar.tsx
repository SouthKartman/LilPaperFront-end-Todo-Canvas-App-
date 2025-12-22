// src/features/canvas-toolbar/ui/CanvasToolbar.tsx
import React from 'react'
import styles from './CanvasToolbar.module.css'



export const CanvasToolbar: React.FC = () => {
  return (
    <div className={styles.toolbar}>
      <div className={styles.tools}>
        <button className={`${styles.toolButton} ${styles.active}`}>
          <span>🔍</span> Выделение
        </button>
        <button className={styles.toolButton}>
          <span>👋</span> Панорамирование
        </button>
        <button className={styles.toolButton}>
          <span>➕</span> Задача
        </button>
        <button className={styles.toolButton}>
          <span>🔗</span> Соединение
        </button>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', color: '#666' }}>Масштаб: 100%</span>
        <button className={styles.toolButton}>Сетка</button>
        <button className={styles.toolButton}>Отменить</button>
      </div>
    </div>
  )
}