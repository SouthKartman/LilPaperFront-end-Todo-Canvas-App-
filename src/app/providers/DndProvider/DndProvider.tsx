// src/app/providers/DndProvider/DndProvider.tsx
import React from 'react'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'

export const DndProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const mouseSensor = useSensor(MouseSensor, {
    // Настройки для мыши
    activationConstraint: {
      distance: 10, // 10px движения до активации
    },
  })
  
  const touchSensor = useSensor(TouchSensor, {
    // Настройки для тач устройств
    activationConstraint: {
      delay: 250, // 250ms задержка
      tolerance: 5, // 5px толерантность
    },
  })

  const sensors = useSensors(mouseSensor, touchSensor)

  return (
    <DndContext sensors={sensors}>
      {children}
    </DndContext>
  )
}