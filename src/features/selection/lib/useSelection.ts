// src/features/selection/lib/useSelection.ts
import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@shared/lib/state'
import {
  selectTodo,
  deselectTodo,
  clearTodoSelection,
  selectImage,
  deselectImage,
  clearImageSelection,
  clearAllSelection,
  setTodoSelection,
  setImageSelection,
} from '../model/slice'
import { RootState } from '@shared/lib/state/store'

export const useSelection = () => {
  const dispatch = useAppDispatch()
  
  const selectedTodoIds = useAppSelector((state: RootState) => 
    state.selection?.selectedTodoIds || []
  )
  
  const selectedImageIds = useAppSelector((state: RootState) => 
    state.selection?.selectedImageIds || []
  )

  // Выделить задачу
  const selectTodoNode = useCallback((id: string, multiSelect: boolean = false) => {
    if (!multiSelect) {
      dispatch(clearImageSelection())
      dispatch(setTodoSelection([id]))
    } else {
      if (selectedTodoIds.includes(id)) {
        dispatch(deselectTodo(id))
      } else {
        dispatch(selectTodo(id))
      }
    }
  }, [dispatch, selectedTodoIds])

  // Выделить изображение
  const selectImageNode = useCallback((id: string, multiSelect: boolean = false) => {
    if (!multiSelect) {
      dispatch(clearTodoSelection())
      dispatch(setImageSelection([id]))
    } else {
      if (selectedImageIds.includes(id)) {
        dispatch(deselectImage(id))
      } else {
        dispatch(selectImage(id))
      }
    }
  }, [dispatch, selectedImageIds])

  // Очистить всё выделение
  const clearSelection = useCallback(() => {
    dispatch(clearAllSelection())
  }, [dispatch])

  // Проверить, выделена ли задача
  const isTodoSelected = useCallback((id: string) => {
    return selectedTodoIds.includes(id)
  }, [selectedTodoIds])

  // Проверить, выделено ли изображение
  const isImageSelected = useCallback((id: string) => {
    return selectedImageIds.includes(id)
  }, [selectedImageIds])

  // Получить количество выделенных элементов
  const selectedCount = selectedTodoIds.length + selectedImageIds.length

  // Есть ли выделение
  const hasSelection = selectedCount > 0

  return {
    // Данные
    selectedTodoIds,
    selectedImageIds,
    selectedCount,
    hasSelection,
    
    // Методы для задач
    selectTodoNode,
    isTodoSelected,
    
    // Методы для изображений
    selectImageNode,
    isImageSelected,
    
    // Общие методы
    clearSelection,
  }
}