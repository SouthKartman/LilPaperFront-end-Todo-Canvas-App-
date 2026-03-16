// src/features/project-management/index.ts
export { default as projectReducer } from './model/slice';
export * from './model/slice';
export * from './model/selectors';
export { useProjects } from './lib/useProjects';