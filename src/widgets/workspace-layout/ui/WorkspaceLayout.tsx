// src/widgets/workspace-layout/ui/WorkspaceLayout.tsx
import React from 'react'
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
  return (
    <div className={styles.layout}>
      {toolbar && (
        <header className={styles.toolbar}>
          {toolbar}
        </header>
      )}
      <div className={styles.content}>
        <main className={styles.main}>
          {children}
        </main>
        {sidebar && (
          <aside className={styles.sidebar}>
            {sidebar}
          </aside>
        )}
      </div>
    </div>
  )
}