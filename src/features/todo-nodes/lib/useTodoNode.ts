// src/features/todo-nodes/lib/useTodoNode.ts
import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@shared/lib/state'
import { createTodo, updateTodo } from '../model/slice'
import type { CreateTodoDto, UpdateTodoDto } from '@entities/todo'

export const useTodoNode = (nodeId?: string) => {
  const dispatch = useAppDispatch()
  const todo = useAppSelector((state: any) => 
    nodeId ? state.todoNodes?.nodes?.[nodeId] : null
  )

  const handleCreate = useCallback((data: CreateTodoDto) => {
    dispatch(createTodo(data))
  }, [dispatch])

  const handleUpdate = useCallback((data: UpdateTodoDto) => {
    dispatch(updateTodo(data))
  }, [dispatch])

  return {
    todo,
    createTodo: handleCreate,
    updateTodo: handleUpdate,
  }
}

export const useTodoNodes = () => {
  const nodes = useAppSelector((state: any) => 
    Object.values(state.todoNodes?.nodes || {})
  )

  return {
    nodes,
  }
}