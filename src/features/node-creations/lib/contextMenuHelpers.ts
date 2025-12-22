import { MenuItemType } from '../model/types'

export const updateMenuItems = (items: MenuItemType[]) => {
  // Эта функция будет использоваться в хуке useContextMenu
  return items
}

export const createMenuItems = (type: 'canvas' | 'node' | 'selection', context?: any) => {
  const baseItems: MenuItemType[] = []
  
  switch (type) {
    case 'canvas':
      baseItems.push(
        {
          id: 'add-todo',
          label: 'Добавить задачу',
          onClick: () => {},
        },
        {
          id: 'add-note',
          label: 'Добавить заметку',
          onClick: () => {},
        }
      )
      break
    case 'node':
      baseItems.push(
        {
          id: 'edit-node',
          label: 'Редактировать',
          onClick: () => {},
        },
        {
          id: 'delete-node',
          label: 'Удалить',
          onClick: () => {},
        }
      )
      break
  }
  
  return baseItems
}