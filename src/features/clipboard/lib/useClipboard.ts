import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { todoNodesActions } from '@features/todo-nodes/model/slice'
import { addImageNodes } from '@features/image-upload/model/slice'
import { selectSelectedTodoNodes } from '@features/todo-nodes/model/selectors'
import { selectSelectedImageNodes } from '@features/image-upload/model/selectors'
import { selectCurrentPage } from '@features/project-management/model/selectors'
import { serializeToClipboard, deserializeFromClipboard, copyToSystemClipboard, readFromSystemClipboard } from './clipboardUtils'

export const useClipboard = () => {
  const dispatch = useDispatch()
  
  const selectedTodos = useSelector(selectSelectedTodoNodes)
  const selectedImages = useSelector(selectSelectedImageNodes)
  const currentPage = useSelector(selectCurrentPage)

  const copy = useCallback(async (): Promise<boolean> => {
    console.log('📋 copy() вызван. Выделено задач:', selectedTodos.length, 'изображений:', selectedImages.length)
    
    if (selectedTodos.length === 0 && selectedImages.length === 0) {
      console.warn('⚠️ Нет выделенных элементов для копирования')
      return false
    }

    const clipboardData = serializeToClipboard(selectedTodos, selectedImages)
    const success = await copyToSystemClipboard(clipboardData)
    
    return success
  }, [selectedTodos, selectedImages])

  const paste = useCallback(async (mousePosition?: { x: number; y: number }): Promise<boolean> => {
    console.log('📋 paste() вызван. Позиция:', mousePosition)
    
    const clipboardData = await readFromSystemClipboard()
    
    if (!clipboardData) {
      console.warn('⚠️ Буфер обмена пуст или содержит неверные данные')
      return false
    }

    const targetPageId = currentPage?.id || 'default_page'
    const basePosition = mousePosition || { x: 100, y: 100 }

    const { todos, images } = deserializeFromClipboard(clipboardData, targetPageId, basePosition)

    todos.forEach(todo => {
      dispatch(todoNodesActions.createTodoAtPosition({
        position: todo.position,
        title: todo.title,
        priority: todo.priority as any,
        pageId: todo.pageId,
      }))
    })

    if (images.length > 0) {
      dispatch(addImageNodes(images))
    }

    console.log('✅ Вставлено:', todos.length, 'задач,', images.length, 'изображений')
    return true
  }, [dispatch, currentPage])

  const canCopy = selectedTodos.length > 0 || selectedImages.length > 0

  return { copy, paste, canCopy, selectedCount: selectedTodos.length + selectedImages.length }
}