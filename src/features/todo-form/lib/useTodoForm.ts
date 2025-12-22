// src/features/todo-form/lib/useTodoForm.ts
import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@shared/lib/state/store'
import { openForm, openQuickForm, closeForm, updateFormData } from '../model/slice'
import { createTodoAtPosition } from '@features/todo-nodes/model/slice'

export const useTodoForm = () => {
  const dispatch = useDispatch<AppDispatch>()
  const formState = useSelector((state: RootState) => state.todoForm)

  const handleOpenForm = useCallback((position?: { x: number; y: number }) => {
    console.log('Opening form at:', position)
    dispatch(openForm({ position }))
  }, [dispatch])

  const handleOpenQuickForm = useCallback((position: { x: number; y: number }) => {
    console.log('Opening quick form at:', position)
    dispatch(openQuickForm({ position }))
  }, [dispatch])

  const handleCloseForm = useCallback(() => {
    console.log('Closing form')
    dispatch(closeForm())
  }, [dispatch])

  const handleUpdateForm = useCallback((data: Partial<any>) => {
    dispatch(updateFormData(data))
  }, [dispatch])

  const handleSubmit = useCallback(() => {
    const { formData, position } = formState
    
    if (!formData.title.trim()) {
      alert('Введите название задачи')
      return
    }

    console.log('Submitting form:', formData)
    
    // Используем createTodoAtPosition вместо createTodo
    dispatch(createTodoAtPosition({
      position: position || { x: 100, y: 100 },
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      type: formData.type,
    }))

    dispatch(closeForm())
  }, [dispatch, formState])

  return {
    isOpen: formState.isOpen,
    isQuickFormOpen: formState.isQuickFormOpen,
    formData: formState.formData,
    position: formState.position,
    openForm: handleOpenForm,
    openQuickForm: handleOpenQuickForm,
    closeForm: handleCloseForm,
    updateForm: handleUpdateForm,
    submitForm: handleSubmit,
  }
}