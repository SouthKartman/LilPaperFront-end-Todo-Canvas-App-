// src/widgets/workspace-layout/ui/WorkspaceLayout.tsx
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { createProject, setCurrentProject } from '@features/project-management/model/slice'
import { selectCurrentProject } from '@features/project-management/model/selectors'
import { PagesSidebar } from '@widgets/pages-workspace/ui/PagesSidebar'
import styles from './WorkspaceLayout.module.css'

interface WorkspaceLayoutProps {
  toolbar?: React.ReactNode
  sidebar?: React.ReactNode
  children: React.ReactNode
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  toolbar,
  sidebar,
  children,
}) => {
  const dispatch = useDispatch()
  const { projectId } = useParams()
  const currentProject = useSelector(selectCurrentProject)
  
  // Открываем проект из URL
  useEffect(() => {
    if (projectId) {
      console.log('📂 Открытие проекта из URL:', projectId)
      dispatch(setCurrentProject(projectId))
    }
  }, [projectId, dispatch])
  
  // Создаем проект только если нет текущего проекта и нет projectId в URL
  useEffect(() => {
    if (!currentProject && !projectId) {
      console.log('🚀 Создание нового проекта (нет проектов)')
      const timer = setTimeout(() => {
        dispatch(createProject({ name: 'Мой Проект' }))
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [currentProject, projectId, dispatch])
  
  return (
    <div className={styles.layout}>
      {toolbar && (
        <header className={styles.toolbar}>
          {toolbar}
        </header>
      )}
      <div className={styles.content}>
        {/* ЛЕВАЯ ПАНЕЛЬ СО СТРАНИЦАМИ */}
        <aside className={styles.pagesSidebar}>
          <PagesSidebar />
        </aside>
        
        {/* ОСНОВНАЯ ОБЛАСТЬ С КАНВАСОМ */}
        <main className={styles.main}>
          {children}
        </main>
        
        {/* ПРАВАЯ ПАНЕЛЬ */}
        {sidebar && (
          <aside className={styles.sidebar}>
            {sidebar}
          </aside>
        )}
      </div>
    </div>
  )
}