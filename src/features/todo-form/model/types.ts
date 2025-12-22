export interface TodoFormData {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'todo' | 'in-progress' | 'done' | 'blocked'
  tags: string[]
  dueDate?: Date
  assignee?: string
  type: 'default' | 'checklist' | 'note' | 'urgent'
}

export interface TodoFormState {
  isOpen: boolean
  isQuickFormOpen: boolean
  formData: TodoFormData
  position?: { x: number; y: number } // Для создания на определенной позиции
}