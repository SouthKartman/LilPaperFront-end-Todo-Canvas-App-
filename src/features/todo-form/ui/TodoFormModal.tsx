import React from 'react'
import { useTodoForm } from '../lib/useTodoForm'
import { TodoForm } from './TodoForm'
import styles from './TodoFormModal.module.css'

export const TodoFormModal: React.FC = () => {
  const { isOpen, closeForm, submitForm } = useTodoForm()

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeForm()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitForm()
  }

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Создание задачи</h2>
          <button 
            className={styles.closeButton}
            onClick={closeForm}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        
        <div className={styles.modalContent}>
          <TodoForm onSubmit={handleSubmit} onCancel={closeForm} />
        </div>
      </div>
    </div>
  )
}