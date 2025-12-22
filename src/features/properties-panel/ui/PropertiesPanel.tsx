// src/features/properties-panel/ui/PropertiesPanel.tsx
import React from 'react'
import styles from './PropertiesPanel.module.css'

export const PropertiesPanel: React.FC = () => {
  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Свойства</h3>
      <div className={styles.content}>
        <p>Выделите элемент для редактирования свойств</p>
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f0f0f0' }}>
          <p><strong>Доступные свойства:</strong></p>
          <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
            <li>Название задачи</li>
            <li>Статус выполнения</li>
            <li>Приоритет</li>
            <li>Дедлайн</li>
            <li>Теги</li>
            <li>Цвет и размер</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
