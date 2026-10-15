// features/storage/lib/importExportService.ts
import { db } from '@shared/api/storage/indexedDB/schema';
import { ZipService } from '@shared/lib/archive/zipService';

export interface PageExportData {
  version: string;
  exportType: 'page' | 'nodes';
  exportDate: string;
  projectId: string;
  pageId?: string;
  pageName?: string;
  nodes: any[];
  images: Array<{
    id: string;
    fileName: string;
    blob: Blob;
  }>;
}

export interface ImportResult {
  success: boolean;
  importedNodes: number;
  importedImages: number;
  errors: string[];
}

type ExportImage = {
  id: string;
  fileName: string;
  blob: Blob;
};

export class PageImportExportService {
  private static readonly IMAGE_PATH_PATTERN =
    /\/images\/projects\/([^/]+)\/([^/]+)$/;

  /**
   * Экспортирует страницу или выбранные ноды в ZIP.
   * Если локальный файл изображения действительно отсутствует, удаляет
   * устаревшие метаданные. Ошибка чтения IndexedDB сама по себе не приводит
   * к удалению данных.
   */
  static async exportNodes(
    nodes: any[],
    projectId: string,
    projectName: string,
    pageId?: string,
    pageName?: string,
    onProgress?: (percent: number, message: string) => void,
  ): Promise<Blob> {
    onProgress?.(0, 'Подготовка данных...');

    const imageNodes = nodes.filter((node) => node.type === 'image');
    const imagesToExport: ExportImage[] = [];
    const validImageIds = new Set<string>();

    onProgress?.(10, `Поиск изображений (${imageNodes.length} нод)...`);

    for (const imageNode of imageNodes) {
      const filePath = typeof imageNode.filePath === 'string'
        ? imageNode.filePath
        : '';
      const match = filePath.match(this.IMAGE_PATH_PATTERN);

      // Не удаляем метаданные внешних URL: это не путь нашего IndexedDB-хранилища.
      if (/^https?:\/\//i.test(filePath)) {
        console.warn('Внешнее изображение не включено в ZIP:', imageNode.id, filePath);
        continue;
      }

      if (!match) {
        console.warn('У изображения некорректный локальный путь:', imageNode.id, filePath);
        await this.removeBrokenImageMetadata(
          imageNode,
          imageNode.projectId ?? projectId,
        );
        continue;
      }

      const [, fileProjectId, fileName] = match;

      try {
        const recordId = `${fileProjectId}_${fileName}`;
        const storedFile = await db.fileStorage.get(recordId);

        if (!storedFile?.blob) {
          console.warn('Файл изображения отсутствует в IndexedDB:', filePath);
          await this.removeBrokenImageMetadata(imageNode, fileProjectId, fileName);
          continue;
        }

        imagesToExport.push({
          id: String(imageNode.id),
          fileName,
          blob: storedFile.blob,
        });
        validImageIds.add(String(imageNode.id));
      } catch (error) {
        // Ошибка чтения может быть временной. Не удаляем запись в этом случае.
        console.error('Ошибка чтения изображения при экспорте:', imageNode.id, error);
      }
    }

    onProgress?.(20, 'Создание манифеста...');

    const exportNodes = nodes
      .filter((node) => node.type !== 'image' || validImageIds.has(String(node.id)))
      .map((node) => ({
        ...node,
        _tempData: undefined,
      }));

    const exportData: PageExportData = {
      version: '4.0',
      exportType: pageId ? 'page' : 'nodes',
      exportDate: new Date().toISOString(),
      projectId,
      pageId,
      pageName: pageName || projectName || 'Экспортированные ноды',
      nodes: exportNodes,
      // Файлы находятся в ZIP отдельно; Blob не дублируем внутри JSON.
      images: [],
    };

    const zipFiles: Array<{ path: string; data: string | Blob }> = [
      { path: 'manifest.json', data: JSON.stringify(exportData, null, 2) },
    ];

    onProgress?.(30, `Добавление изображений (${imagesToExport.length})...`);

    for (let i = 0; i < imagesToExport.length; i++) {
      const image = imagesToExport[i];
      // Формат с отдельными сегментами безопасно сохраняет ID с подчёркиваниями.
      zipFiles.push({
        path: `images/${encodeURIComponent(image.id)}/${encodeURIComponent(image.fileName)}`,
        data: image.blob,
      });

      const percent = imagesToExport.length
        ? 30 + ((i + 1) / imagesToExport.length) * 60
        : 90;
      onProgress?.(percent, `Изображения: ${i + 1}/${imagesToExport.length}`);

      if (i % 10 === 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }

    onProgress?.(90, 'Создание архива...');
    const blob = await ZipService.createArchive(zipFiles);
    onProgress?.(100, 'Готово!');
    return blob;
  }

  /**
   * Импортирует ноды в проект и сохраняет файлы с фактическими именами,
   * используемыми в fileStorage.
   */
  static async importNodes(
    file: File,
    targetProjectId: string,
    targetPageId: string,
    onProgress?: (percent: number, message: string) => void,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      importedNodes: 0,
      importedImages: 0,
      errors: [],
    };

    onProgress?.(0, 'Чтение архива...');

    try {
      const zip = await ZipService.readArchive(file);
      const manifestContent = await ZipService.getFileContent(zip, 'manifest.json');

      if (!manifestContent) {
        throw new Error('manifest.json не найден');
      }

      const manifest = JSON.parse(manifestContent) as PageExportData;
      if (!Array.isArray(manifest.nodes)) {
        throw new Error('В manifest.json отсутствует массив nodes');
      }

      onProgress?.(10, 'Манифест загружен');

      const restoredImages = new Map<string, string>();
      const imagesFolder = zip.folder('images');
      const imageFiles = imagesFolder
        ? Object.values(imagesFolder.files).filter((entry: any) => !entry.dir)
        : [];

      // Сопоставление старого формата ZIP: images/<nodeId>_<fileName>.
      const originalImageNodes = manifest.nodes.filter((node) => node.type === 'image');

      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i] as any;

        try {
          const blob = await imageFile.async('blob');
          const relativePath = String(imageFile.name).replace(/^images\//, '');
          let oldNodeId: string | undefined;
          let archivedFileName: string | undefined;

          // Новый формат: images/<encoded node id>/<encoded filename>.
          const segments = relativePath.split('/');
          if (segments.length >= 2) {
            try {
              oldNodeId = decodeURIComponent(segments[0]);
              archivedFileName = decodeURIComponent(segments.slice(1).join('/'));
            } catch {
              oldNodeId = undefined;
              archivedFileName = undefined;
            }
          }

          // Совместимость со старым форматом, где ID и имя разделены "_".
          if (!oldNodeId || !archivedFileName) {
            const legacyMatch = originalImageNodes
              .map((node) => {
                const pathMatch = String(node.filePath ?? '').match(this.IMAGE_PATH_PATTERN);
                return pathMatch
                  ? { node, fileName: pathMatch[2] as string }
                  : null;
              })
              .filter((entry): entry is { node: any; fileName: string } => Boolean(entry))
              .find((entry) => relativePath.endsWith(`_${entry.fileName}`));

            if (legacyMatch) {
              oldNodeId = String(legacyMatch.node.id);
              archivedFileName = legacyMatch.fileName;
            } else {
              // Последний резервный вариант для старых архивов без ноды в манифесте.
              const separator = relativePath.lastIndexOf('_');
              oldNodeId = separator > 0 ? relativePath.slice(0, separator) : undefined;
              archivedFileName = separator > 0
                ? relativePath.slice(separator + 1)
                : relativePath;
            }
          }

          if (!oldNodeId || !archivedFileName) {
            throw new Error('Не удалось определить ID ноды и имя файла в архиве');
          }

          const extensionMatch = archivedFileName.match(/\.([a-zA-Z0-9]+)$/);
          const extension = extensionMatch?.[1] ?? 'png';
          const fileName = `image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
          const mimeType = blob.type || this.mimeTypeFromExtension(extension);
          const storedBlob = blob.type === mimeType
            ? blob
            : new Blob([blob], { type: mimeType });
          const recordId = `${targetProjectId}_${fileName}`;
          const now = new Date().toISOString();

          // Запись соответствует схеме fileStorage и формату FileService.
          await db.fileStorage.put({
            id: recordId,
            projectId: targetProjectId,
            fileName,
            blob: storedBlob,
            mimeType,
            size: storedBlob.size,
            createdAt: now,
            lastAccessed: now,
          });

          // Проверяем, что запись реально доступна после сохранения.
          const savedRecord = await db.fileStorage.get(recordId);
          if (!savedRecord?.blob || savedRecord.blob.size !== storedBlob.size) {
            await db.fileStorage.delete(recordId);
            throw new Error('Файл не удалось проверить после сохранения в IndexedDB');
          }

          restoredImages.set(
            oldNodeId,
            `/images/projects/${targetProjectId}/${fileName}`,
          );
          result.importedImages++;

          const percent = imageFiles.length
            ? 10 + ((i + 1) / imageFiles.length) * 40
            : 50;
          onProgress?.(percent, `Восстановление изображений: ${i + 1}/${imageFiles.length}`);
        } catch (error) {
          result.errors.push(
            `Ошибка восстановления ${imageFile.name}: ${error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      onProgress?.(50, 'Обновление метаданных...');

      const importedNodes: any[] = [];

      for (const node of manifest.nodes) {
        const newId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${node.id}`;

        if (node.type === 'image') {
          const newPath = restoredImages.get(String(node.id));
          if (!newPath) {
            result.errors.push(`Изображение ноды ${node.id} отсутствует в архиве или не восстановлено`);
            continue;
          }

          importedNodes.push({
            ...node,
            id: newId,
            filePath: newPath,
            projectId: targetProjectId,
            pageId: targetPageId,
            updatedAt: new Date().toISOString(),
          });
        } else {
          importedNodes.push({
            ...node,
            id: newId,
            projectId: targetProjectId,
            pageId: targetPageId,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      result.importedNodes = importedNodes.length;
      onProgress?.(80, `Сохранение ${importedNodes.length} нод...`);

      const todosToSave = importedNodes.filter((node) => node.type === 'todo');
      const imagesToSave = importedNodes.filter((node) => node.type === 'image');

      await db.transaction('rw', db.todos, db.images, async () => {
        if (todosToSave.length > 0) {
          await db.todos.bulkPut(todosToSave);
        }
        if (imagesToSave.length > 0) {
          await db.images.bulkPut(imagesToSave);
        }
      });

      result.success = true;
      onProgress?.(100, result.errors.length
        ? `Импорт завершён с предупреждениями (${result.errors.length})`
        : 'Импорт завершён!');
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Неизвестная ошибка');
      onProgress?.(100, `Ошибка: ${result.errors[0]}`);
    }

    return result;
  }

  /**
   * Удаляет запись изображения, связанные fileMetadata и ссылки в канвасах.
   * Сам fileStorage не трогает: этот метод вызывается, когда файл уже отсутствует
   * или путь не позволяет безопасно определить запись файла.
   */
  private static async removeBrokenImageMetadata(
    imageNode: any,
    projectId: string,
    fileName?: string,
  ): Promise<void> {
    await db.transaction(
      'rw',
      db.images,
      db.fileMetadata,
      db.canvases,
      async () => {
        await db.images.delete(imageNode.id);

        const metadata = await db.fileMetadata.toArray();
        const metadataIds = metadata
          .filter((item: any) => {
            if (item.imageNodeId === imageNode.id) return true;
            return Boolean(
              fileName &&
              item.projectId === projectId &&
              item.fileName === fileName,
            );
          })
          .map((item: any) => item.id)
          .filter((id: unknown) => id !== undefined);

        if (metadataIds.length > 0) {
          await db.fileMetadata.bulkDelete(metadataIds as number[]);
        }

        const canvases = await db.canvases.toArray();
        for (const canvas of canvases as any[]) {
          if (Array.isArray(canvas.nodes) && canvas.nodes.includes(imageNode.id)) {
            await db.canvases.update(canvas.id, {
              nodes: canvas.nodes.filter((id: string) => id !== imageNode.id),
            });
          }
        }
      },
    );
  }

  private static mimeTypeFromExtension(extension: string): string {
    const types: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      avif: 'image/avif',
    };
    return types[extension.toLowerCase()] ?? 'application/octet-stream';
  }
}