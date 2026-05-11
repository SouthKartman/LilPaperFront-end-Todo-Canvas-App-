export { db, TodoAppDatabase } from './schema';
export { TodoIndexedDBStorage } from './todoStorage';
export { ImageIndexedDBStorage } from './imageStorage';
export { ProjectIndexedDBStorage } from './projectStorage';
export type { 
  DBTodo, 
  DBImage, 
  DBProject, 
  DBPage, 
  DBCanvas,
  DBSyncLog 
} from './schema';