// src/features/todo-form/ui/QuickTodoForm.tsx
import React, { useRef, useEffect } from 'react'
import { useTodoForm } from '../lib/useTodoForm'
import styles from './TodoForm.module.css'

export const QuickTodoForm: React.FC = () => {
  const { isQuickFormOpen, formData, closeForm, updateForm, submitForm } = useTodoForm()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // console.log('QuickTodoForm mounted, isOpen:', isQuickFormOpen)
    if (isQuickFormOpen && inputRef.current) {
      console.log('Setting focus to input')
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isQuickFormOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Quick form submit')
    if (formData.title.trim()) {
      submitForm()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      console.log('Escape pressed')
      closeForm()
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit(e)
    }
  }

  // console.log('QuickTodoForm render, isOpen:', isQuickFormOpen)

  if (!isQuickFormOpen) {
    // console.log('QuickTodoForm: not rendering (isOpen false)')
    return null
  }

  return (
    <div 
      className={styles.quickFormOverlay}
      onClick={(e) => {
        console.log('Overlay clicked')
        closeForm()
      }}
    >
      <div 
        className={styles.quickFormContainer}
        onClick={(e) => {
          console.log('Container clicked')
          e.stopPropagation()
        }}
      >
        <form 
          className={styles.quickForm}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
        >
          <input
            ref={inputRef}
            type="text"
            value={formData.title}
            onChange={(e) => {
              console.log('Input changed:', e.target.value)
              updateForm({ title: e.target.value })
            }}
            className={styles.quickInput}
            placeholder="Название задачи..."
            onClick={(e) => e.stopPropagation()}
          />
          <div className={styles.quickFormActions}>
            <select
              value={formData.priority}
              onChange={(e) => {
                console.log('Priority changed:', e.target.value)
                updateForm({ priority: e.target.value as unknown })
              }}
              className={styles.quickSelect}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="low">Низкий</option>
              <option value="medium">Средний</option>
              <option value="high">Высокий</option>
            </select>
            <button
              type="submit"
              className={styles.quickSubmitButton}
              disabled={!formData.title.trim()}
              onClick={(e) => {
                console.log('Submit button clicked')
                e.stopPropagation()
              }}
            >
              Создать
            </button>
            <button
              type="button"
              className={styles.quickCancelButton}
              onClick={(e) => {
                console.log('Cancel button clicked')
                e.stopPropagation()
                closeForm()
              }}
            >
              ✕
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}