import React, { useState } from 'react'
import { useTodoForm } from '../lib/useTodoForm'
// import { TagInput } from '@shared/ui/kit/TagInput'
import { DatePicker } from '@shared/ui/kit/DatePicker/DatePicker'
import styles from './TodoForm.module.css'

interface TodoFormProps {
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  isQuick?: boolean
}

export const TodoForm: React.FC<TodoFormProps> = ({ 
  onSubmit, 
  onCancel,
  isQuick = false 
}) => {
  const { formData, updateForm } = useTodoForm()
  const [tagInput, setTagInput] = useState('')

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      updateForm({ tags: [...formData.tags, tagInput.trim()] })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    updateForm({ tags: formData.tags.filter(t => t !== tag) })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      onSubmit(e)
    }
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <form 
      className={`${styles.form} ${isQuick ? styles.quickForm : ''}`}
      onSubmit={onSubmit}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.formGroup}>
        <label className={styles.label}>
          Название задачи *
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateForm({ title: e.target.value })}
            className={styles.input}
            placeholder="Что нужно сделать?"
            autoFocus
            required
          />
        </label>
      </div>

      {!isQuick && (
        <>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Описание
              <textarea
                value={formData.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                className={styles.textarea}
                placeholder="Детальное описание задачи..."
                rows={4}
              />
            </label>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Приоритет
                <select
                  value={formData.priority}
                  onChange={(e) => updateForm({ priority: e.target.value as any })}
                  className={styles.select}
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                  <option value="critical">Критический</option>
                </select>
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Тип задачи
                <select
                  value={formData.type}
                  onChange={(e) => updateForm({ type: e.target.value as any })}
                  className={styles.select}
                >
                  <option value="default">Обычная задача</option>
                  <option value="checklist">Чек-лист</option>
                  <option value="note">Заметка</option>
                  <option value="urgent">Срочная</option>
                </select>
              </label>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Срок выполнения
                <DatePicker
                  value={formData.dueDate}
                  onChange={(date) => updateForm({ dueDate: date })}
                  className={styles.datePicker}
                />
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Статус
                <select
                  value={formData.status}
                  onChange={(e) => updateForm({ status: e.target.value as any })}
                  className={styles.select}
                >
                  <option value="todo">К выполнению</option>
                  <option value="in-progress">В процессе</option>
                  <option value="done">Выполнено</option>
                  <option value="blocked">Заблокировано</option>
                </select>
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Теги
              <div className={styles.tagContainer}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  className={styles.tagInput}
                  placeholder="Добавить тег..."
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className={styles.tagAddButton}
                >
                  Добавить
                </button>
              </div>
              <div className={styles.tagsList}>
                {formData.tags.map(tag => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className={styles.tagRemove}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </label>
          </div>
        </>
      )}

      <div className={styles.formActions}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.cancelButton}
        >
          Отмена
        </button>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={!formData.title.trim()}
        >
          {isQuick ? 'Создать' : 'Создать задачу'}
        </button>
      </div>
      
      {!isQuick && (
        <div className={styles.formHint}>
          Нажмите Ctrl+Enter для быстрого сохранения
        </div>
      )}
    </form>
  )
}