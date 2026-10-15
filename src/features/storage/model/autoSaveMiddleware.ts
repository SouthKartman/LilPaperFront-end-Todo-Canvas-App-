// src/features/storage/model/autoSaveMiddleware.ts

import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '@shared/lib/state/store';
import { TodoIndexedDBStorage } from '@shared/api/storage/indexedDB/todoStorage';
import { ImageIndexedDBStorage } from '@shared/api/storage/indexedDB/imageStorage';
import { ProjectIndexedDBStorage } from '@shared/api/storage/indexedDB/projectStorage';
import { db } from '@shared/api/storage/indexedDB/schema';

const TODO_SAVE_ACTIONS = [
  'todoNodes/createTodo',
  'todoNodes/createTodoAtPosition',
  'todoNodes/createTodoForPage',
  'todoNodes/duplicateTodo',
  'todoNodes/updateTodo',
  'todoNodes/updateTodoPartial',
  'todoNodes/deleteTodo',
  'todoNodes/deleteSelectedTodos',
  'todoNodes/moveTodo',
  'todoNodes/resizeTodo',
  'todoNodes/setTodoStatus',
  'todoNodes/setTodoPriority',
  'todoNodes/addTodoTag',
  'todoNodes/removeTodoTag',
  'todoNodes/importNodes',
  'todoNodes/clearAllNodes',
];

const IMAGE_SAVE_ACTIONS = [
  'imageNodes/addImageNode',
  'imageNodes/addImageNodes',
  'imageNodes/updateImageNode',
  'imageNodes/moveImageNode',
  'imageNodes/resizeImageNode',
  'imageNodes/setImageZIndex',
  'imageNodes/deleteImageNode',
  'imageNodes/deleteImageNodes',
  'imageNodes/clearAllImages',
  'imageNodes/importImages',
];

const IMAGE_DELETE_ACTIONS = new Set([
  'imageNodes/deleteImageNode',
  'imageNodes/deleteImageNodes',
  'imageNodes/clearAllImages',
]);

const PROJECT_SAVE_ACTIONS = [
  'project/createProject',
  'project/addPage',
  'project/switchPage',
  'project/setPageName',
  'project/removePage',
  'project/reorderPages',
  'project/addNodeToCanvas',
  'project/removeNodeFromCanvas',
  'project/moveNodeBetweenCanvases',
  'project/setCurrentProject',
  'project/updateProjectName',
  'project/setProjectPreview',
  'project/deleteProject',
  'project/updateCanvas',
  'project/loadProjectState',
];

const saveQueue = new Map<string, ReturnType<typeof setTimeout>>();

function debounce(key: string, callback: () => Promise<void>, delay = 1000) {
  const previous = saveQueue.get(key);
  if (previous) clearTimeout(previous);

  const timeout = setTimeout(async () => {
    try {
      await callback();
    } finally {
      // Не удаляем более новый таймер, который мог быть поставлен
      // пока асинхронный callback выполнялся.
      if (saveQueue.get(key) === timeout) {
        saveQueue.delete(key);
      }
    }
  }, delay);

  saveQueue.set(key, timeout);
}

async function deleteImageRecords(
  imageIds: string[],
  previousNodes: Record<string, any>,
) {
  const uniqueIds = [...new Set(imageIds)].filter(Boolean);
  if (uniqueIds.length === 0) return;

  // Сохраняем filePath до удаления, чтобы убрать метаданные,
  // даже если в fileMetadata нет imageNodeId.
  const fileKeys = new Set<string>();
  for (const id of uniqueIds) {
    const image = previousNodes[id];
    const match = image?.filePath?.match(/\/images\/projects\/([^/]+)\/([^/]+)$/);
    if (match) fileKeys.add(`${match[1]}\0${match[2]}`);
  }

  // deleteImages удаляет файлы из fileStorage и записи из db.images.
  await ImageIndexedDBStorage.deleteImages(uniqueIds);

  await db.transaction('rw', db.fileMetadata, db.canvases, async () => {
    const metadata = await db.fileMetadata.toArray();
    const metadataIds = metadata
      .filter((item: any) =>
        (item.imageNodeId && uniqueIds.includes(item.imageNodeId)) ||
        (item.projectId && item.fileName && fileKeys.has(`${item.projectId}\0${item.fileName}`))
      )
      .map((item: any) => item.id)
      .filter((id: unknown) => id !== undefined);

    if (metadataIds.length > 0) {
      await db.fileMetadata.bulkDelete(metadataIds as number[]);
    }

    const canvases = await db.canvases.toArray();
    for (const canvas of canvases) {
      if (Array.isArray(canvas.nodes) && canvas.nodes.some((id: string) => uniqueIds.includes(id))) {
        await db.canvases.update(canvas.id, {
          nodes: canvas.nodes.filter((id: string) => !uniqueIds.includes(id)),
        });
      }
    }
  });
}

let imageWriteQueue: Promise<void> = Promise.resolve();

function enqueueImageWrite(task: () => Promise<void>) {
  imageWriteQueue = imageWriteQueue
    .catch(error => {
      console.error('Предыдущая операция с изображениями завершилась ошибкой:', error);
    })
    .then(task);
  return imageWriteQueue;
}


/**
 * Полностью удаляет проект и принадлежащие ему данные из IndexedDB.
 * Используем фильтрацию по полям, а не where('projectId'), чтобы не зависеть
 * от того, какие индексы объявлены в текущей версии Dexie-схемы.
 */
async function deleteProjectFromIndexedDB(
  projectId: string,
  previousState: RootState,
): Promise<void> {
  const project = previousState.project?.projects?.[projectId];
  const pageIds = new Set<string>(project?.pageIds ?? []);
  const canvasIds = new Set<string>();

  for (const pageId of pageIds) {
    const page = previousState.project?.pages?.[pageId];
    if (page?.canvasId) canvasIds.add(page.canvasId);
  }

  // Учитываем также записи, которые уже есть в IndexedDB, но отсутствуют в Redux.
  const [dbPages, dbCanvases, dbTodos, dbImages] = await Promise.all([
    db.pages.toArray(),
    db.canvases.toArray(),
    db.todos.toArray(),
    db.images.toArray(),
  ]);

  for (const page of dbPages as any[]) {
    if (page.projectId === projectId || pageIds.has(page.id)) pageIds.add(page.id);
  }

  for (const canvas of dbCanvases as any[]) {
    if (canvas.projectId === projectId || pageIds.has(canvas.pageId)) {
      canvasIds.add(canvas.id);
      if (canvas.pageId) pageIds.add(canvas.pageId);
    }
  }

  const todoIds = (dbTodos as any[])
    .filter(todo => todo.projectId === projectId || pageIds.has(todo.pageId))
    .map(todo => todo.id)
    .filter(Boolean);

  const imageRows = (dbImages as any[])
    .filter(image => image.projectId === projectId || pageIds.has(image.pageId));
  const imageIds = imageRows.map(image => image.id).filter(Boolean);

  // Дождёмся операций с изображениями, затем удалим всё в одной транзакции.
  await imageWriteQueue.catch(() => undefined);

  await db.transaction(
    'rw',
    [
      db.projects,
      db.pages,
      db.canvases,
      db.todos,
      db.images,
      db.fileStorage,
      db.fileMetadata,
      db.syncLog,
    ],
    async () => {
      await db.projects.delete(projectId);

      const pagesToDelete = (await db.pages.toArray() as any[])
        .filter(page => page.projectId === projectId || pageIds.has(page.id))
        .map(page => page.id)
        .filter(Boolean);
      if (pagesToDelete.length) await db.pages.bulkDelete(pagesToDelete);

      const canvasesToDelete = (await db.canvases.toArray() as any[])
        .filter(canvas =>
          canvas.projectId === projectId ||
          canvasIds.has(canvas.id) ||
          pageIds.has(canvas.pageId),
        )
        .map(canvas => canvas.id)
        .filter(Boolean);
      if (canvasesToDelete.length) await db.canvases.bulkDelete(canvasesToDelete);

      const todosToDelete = (await db.todos.toArray() as any[])
        .filter(todo =>
          todo.projectId === projectId ||
          pageIds.has(todo.pageId) ||
          todoIds.includes(todo.id),
        )
        .map(todo => todo.id)
        .filter(Boolean);
      if (todosToDelete.length) await db.todos.bulkDelete(todosToDelete);

      const imagesToDelete = (await db.images.toArray() as any[])
        .filter(image =>
          image.projectId === projectId ||
          pageIds.has(image.pageId) ||
          imageIds.includes(image.id),
        );
      const finalImageIds = imagesToDelete.map(image => image.id).filter(Boolean);
      if (finalImageIds.length) await db.images.bulkDelete(finalImageIds);

      // Удаляем Blob-файлы только этого проекта.
      const filesToDelete = (await db.fileStorage.toArray() as any[])
        .filter(file => file.projectId === projectId)
        .map(file => file.id)
        .filter(Boolean);
      if (filesToDelete.length) await db.fileStorage.bulkDelete(filesToDelete);

      const metadataToDelete = (await db.fileMetadata.toArray() as any[])
        .filter(metadata =>
          metadata.projectId === projectId ||
          (metadata.imageNodeId && finalImageIds.includes(metadata.imageNodeId)),
        )
        .map(metadata => metadata.id)
        .filter((id: unknown) => id !== undefined);
      if (metadataToDelete.length) await db.fileMetadata.bulkDelete(metadataToDelete as number[]);

      const deletedEntityIds = new Set<string>([
        projectId,
        ...pageIds,
        ...canvasIds,
        ...todoIds,
        ...finalImageIds,
      ]);
      const syncRowsToDelete = (await db.syncLog.toArray() as any[])
        .filter(row => deletedEntityIds.has(row.entityId))
        .map(row => row.id)
        .filter((id: unknown) => id !== undefined);
      if (syncRowsToDelete.length) await db.syncLog.bulkDelete(syncRowsToDelete as number[]);
    },
  );

  console.log(
    `🧹 Проект ${projectId} удалён из IndexedDB: страниц ${pageIds.size}, задач ${todoIds.length}, изображений ${imageIds.length}`,
  );
}

export const autoSaveMiddleware: Middleware = store => next => action => {
  // Берём предыдущее состояние до reducer: после удаления в Redux
  // объект уже не содержит удалённые изображения.
  const previousState = store.getState() as RootState;
  const result = next(action);
  const actionType = (action as { type?: string }).type ?? '';
  const payload = (action as { payload?: unknown }).payload;
  if (TODO_SAVE_ACTIONS.includes(actionType)) {
    debounce('todos', async () => {
      // Читаем актуальное состояние непосредственно перед сохранением.
      const current = store.getState() as RootState;
      const todoNodes = current.todoNodes?.nodes;
      if (todoNodes) {
        // Сохраняем и пустой объект: удаление последней задачи тоже важно.
        await TodoIndexedDBStorage.saveTodos(todoNodes);
        console.log(`💾 Автосохранение ${Object.keys(todoNodes).length} задач в IndexedDB`);
      }
    });
  }

  if (IMAGE_DELETE_ACTIONS.has(actionType)) {
    const previousNodes = previousState.imageNodes?.nodes ?? {};
    let idsToDelete: string[] = [];

    if (actionType === 'imageNodes/deleteImageNode' && typeof payload === 'string') {
      idsToDelete = [payload];
    } else if (actionType === 'imageNodes/deleteImageNodes' && Array.isArray(payload)) {
      idsToDelete = payload.filter((id): id is string => typeof id === 'string');
    } else if (actionType === 'imageNodes/clearAllImages') {
      idsToDelete = Object.keys(previousNodes);
    }

    // При clearAllImages также удаляем записи, оставшиеся в IndexedDB,
    // даже если они уже отсутствовали в Redux.
    const deletion = actionType === 'imageNodes/clearAllImages'
      ? ImageIndexedDBStorage.loadImages().then(images => [
        ...new Set([
          ...idsToDelete,
          ...images.map((image: any) => image.id).filter(Boolean),
        ]),
      ])
      : Promise.resolve(idsToDelete);

    // Удаление выполняем сразу и сериализуем с другими операциями
    // над изображениями, чтобы автосохранение не восстановило удалённые записи.
    void enqueueImageWrite(async () => {
      const ids = await deletion;
      await deleteImageRecords(ids, previousNodes);

      const current = store.getState() as RootState;
      await ImageIndexedDBStorage.saveImages(current.imageNodes?.nodes ?? {});

      console.log(`🗑️ Удалено изображений из IndexedDB: ${ids.length}`);
    }).catch(error => {
      console.error('❌ Не удалось удалить изображения из IndexedDB:', error);
    });
  } else if (IMAGE_SAVE_ACTIONS.includes(actionType)) {
    debounce('images', async () => {
      await enqueueImageWrite(async () => {
        const current = store.getState() as RootState;
        const imageNodes = current.imageNodes?.nodes;
        if (imageNodes) {
          await ImageIndexedDBStorage.saveImages(imageNodes);
          console.log(`🖼️ Автосохранение ${Object.keys(imageNodes).length} изображений в IndexedDB`);
        }
      });
    });
  }

  if (actionType === 'project/deleteProject' && typeof payload === 'string') {
    const projectId = payload;
    const projectBeforeDelete = previousState.project?.projects?.[projectId];
    const pageIds = new Set<string>(projectBeforeDelete?.pageIds ?? []);

    // Удаляем ноды проекта и из Redux, иначе последующий autosave
    // может снова записать их в IndexedDB.
    const todoIds = Object.values(previousState.todoNodes?.nodes ?? {})
      .filter((todo: any) => todo.projectId === projectId || pageIds.has(todo.pageId))
      .map((todo: any) => todo.id)
      .filter(Boolean);
    const imageIds = Object.values(previousState.imageNodes?.nodes ?? {})
      .filter((image: any) => image.projectId === projectId || pageIds.has(image.pageId))
      .map((image: any) => image.id)
      .filter(Boolean);

    if (imageIds.length > 0) {
      store.dispatch({ type: 'imageNodes/deleteImageNodes', payload: imageIds });
    }
    for (const todoId of todoIds) {
      store.dispatch({ type: 'todoNodes/deleteTodo', payload: todoId });
    }

    // Отменяем отложенную запись состояния проекта. После очистки сохраняем
    // актуальное состояние с оставшимися проектами.
    const pendingProjectSave = saveQueue.get('project');
    if (pendingProjectSave) {
      clearTimeout(pendingProjectSave);
      saveQueue.delete('project');
    }

    void (async () => {
      try {
        await deleteProjectFromIndexedDB(projectId, previousState);

        const current = store.getState() as RootState;
        const remainingProjectState = {
          currentProjectId: current.project?.currentProjectId,
          projects: current.project?.projects || {},
          pages: current.project?.pages || {},
          canvases: current.project?.canvases || {},
          projectOrder: current.project?.projectOrder || [],
          metadata: {
            savedAt: new Date().toISOString(),
            version: '2.0',
          },
        };

        await ProjectIndexedDBStorage.saveProject(remainingProjectState);
        localStorage.setItem('project_state', JSON.stringify(remainingProjectState));

        console.log(`✅ Проект ${projectId} и связанные данные удалены`);
      } catch (error) {
        console.error(`❌ Не удалось полностью удалить проект ${projectId}:`, error);
      }
    })();
  } else if (PROJECT_SAVE_ACTIONS.includes(actionType)) {
    debounce('project', async () => {
      const current = store.getState() as RootState;
      const projectState = {
        currentProjectId: current.project?.currentProjectId,
        projects: current.project?.projects || {},
        pages: current.project?.pages || {},
        canvases: current.project?.canvases || {},
        metadata: {
          savedAt: new Date().toISOString(),
          version: '2.0',
        },
      };

      try {
        await ProjectIndexedDBStorage.saveProject(projectState);
        console.log('📁 Автосохранение проекта в IndexedDB');
      } catch (error) {
        console.error('❌ Ошибка автосохранения проекта в IndexedDB:', error);
        try {
          localStorage.setItem('project_state', JSON.stringify({
            ...projectState,
            metadata: { ...projectState.metadata, version: '1.1' },
          }));
          console.log('📁 Сохранено в localStorage как fallback');
        } catch (fallbackError) {
          console.error('❌ Критическая ошибка сохранения проекта:', fallbackError);
        }
      }
    });
  }

  return result;
};