// src/features/selection/lib/useSelection.ts
import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@shared/lib/state'
import { selectNode, deselectNode, clearSelection } from '@features/todo-nodes/model/slice'

export const useSelection = () => {
  const dispatch = useAppDispatch()
  const selectedNodeIds = useAppSelector((state: any) => 
    state.todoNodes?.selectedNodeIds || []
  )

  const handleSelectNode = useCallback((nodeId: string, addToSelection = false) => {
    if (addToSelection && (event as MouseEvent).ctrlKey) {
      if (selectedNodeIds.includes(nodeId)) {
        dispatch(deselectNode(nodeId))
      } else {
        dispatch(selectNode(nodeId))
      }
    } else {
      if (!selectedNodeIds.includes(nodeId)) {
        dispatch(clearSelection())
        dispatch(selectNode(nodeId))
      }
    }
  }, [dispatch, selectedNodeIds])

  const handleClearSelection = useCallback(() => {
    dispatch(clearSelection())
  }, [dispatch])

  return {
    selectedNodeIds,
    handleSelectNode,
    handleClearSelection,
    isNodeSelected: (nodeId: string) => selectedNodeIds.includes(nodeId),
  }
}