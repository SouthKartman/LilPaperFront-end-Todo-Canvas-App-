// src/app/providers/ThemeProvider/ThemeProvider.tsx
import React from 'react'

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  return <>{children}</>
}