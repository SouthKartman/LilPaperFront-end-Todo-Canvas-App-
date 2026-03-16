// src/config/routes.ts
export const ROUTES = {
  HOME: '/',
  PROJECTS: '/projects',
  PROJECT: (id: string) => `/project/${id}`,
  PROJECT_PAGE: (projectId: string, pageId: string) => `/project/${projectId}/page/${pageId}`,
} as const;