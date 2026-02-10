// src/widgets/workspace-layout/ui/WorkspaceLayout.tsx
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createProject } from '@features/project-management/model/slice'
import { selectCurrentProject } from '@shared/lib/state/store'
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
  const currentProject = useSelector(selectCurrentProject)
  
  // 🆕 АВТОМАТИЧЕСКОЕ СОЗДАНИЕ ПРОЕКТА ПРИ ЗАГРУЗКЕ
  useEffect(() => {
    if (!currentProject) {
      // Даем небольшую задержку для загрузки сохраненного состояния
      const timer = setTimeout(() => {
        dispatch(createProject({ name: 'Мой Проект' }))
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [currentProject, dispatch])
  
  return (
    <div className={styles.layout}>
      {toolbar && (
        <header className={styles.toolbar}>
          {toolbar}
        </header>
      )}
      <div className={styles.content}>
        {/* 🆕 ЛЕВАЯ ПАНЕЛЬ СО СТРАНИЦАМИ */}
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