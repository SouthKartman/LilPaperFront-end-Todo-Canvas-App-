// src/widgets/workspace-layout/ui/WorkspaceLayout.tsx
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { createProject, setCurrentProject } from '@features/project-management/model/slice'
import { selectCurrentProject } from '@features/project-management/model/selectors'
// import { PagesSidebar } from '@widgets/pages-workspace/ui/PagesSidebar'
import styles from './WorkspaceLayout.module.css'
import { MenuSidebar } from '@widgets/menu-sidebar/ui/MenuSidebar'
import { Header } from '@shared/ui/kit/Header/ui/Header.component'
import { PageSideMenu } from '@widgets/pages-workspace/ui/PageSideMenu'

interface WorkspaceLayoutProps {
  toolbar?: React.ReactNode
  sidebar?: React.ReactNode
  children: React.ReactNode
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  toolbar,
  // sidebar,
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
          {/* Legacy */}
          {/* {toolbar} */}
          <Header/>
          <PageSideMenu/>
        </header>
      )}
      <div className={styles.content}>
        <aside className={styles.MenuSidebar}>
          <MenuSidebar></MenuSidebar>
        </aside>
        {/* ЛЕВАЯ ПАНЕЛЬ СО СТРАНИЦАМИ */}
        {/* <aside className={styles.pagesSidebar}>
          <PagesSidebar />
        </aside> */}

       
        
        {/* ОСНОВНАЯ ОБЛАСТЬ С КАНВАСОМ */}
        <main className={styles.main}>
          {children}
        </main>
        
      {/* Legacy */}

        {/* ПРАВАЯ ПАНЕЛЬ */}
        {/* {sidebar && (
          <aside className={styles.sidebar}>
            {sidebar}
          </aside>
        )} */}

      </div>
    </div>
  )
}