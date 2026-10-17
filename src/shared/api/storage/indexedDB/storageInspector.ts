import { db } from './schema';

export interface StorageTableMetric {
  name: string;
  count: number;
  containsBlob: boolean;
}

export interface StorageSnapshot {
  databaseName: string;
  tables: StorageTableMetric[];
  totalRecords: number;
  usageBytes: number | null;
  quotaBytes: number | null;
  usagePercent: number | null;
  collectedAt: string;
}

const BLOB_TABLES = new Set(['fileStorage']);

/** Read-only diagnostics. Does not mutate the database. */
export async function getStorageSnapshot(): Promise<StorageSnapshot> {
  const tables = await Promise.all(db.tables.map(async (table) => ({
    name: table.name,
    count: await table.count(),
    containsBlob: BLOB_TABLES.has(table.name),
  })));

  let usageBytes: number | null = null;
  let quotaBytes: number | null = null;
  let usagePercent: number | null = null;

  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      usageBytes = typeof estimate.usage === 'number' ? estimate.usage : null;
      quotaBytes = typeof estimate.quota === 'number' ? estimate.quota : null;
      if (usageBytes !== null && quotaBytes && quotaBytes > 0) {
        usagePercent = Math.min(100, usageBytes / quotaBytes * 100);
      }
    } catch (error) {
      console.warn('[StorageInspector] Не удалось получить оценку хранилища:', error);
    }
  }

  return {
    databaseName: db.name,
    tables,
    totalRecords: tables.reduce((sum, table) => sum + table.count, 0),
    usageBytes,
    quotaBytes,
    usagePercent,
    collectedAt: new Date().toISOString(),
  };
}

/**
 * Returns a page of records. fileStorage is deliberately excluded because
 * IndexedDB cannot project fields and reading a row would materialize its Blob.
 */
export async function getStorageTablePage(
  tableName: string,
  offset = 0,
  limit = 25,
): Promise<{ records: Array<{ key: string; value: unknown }>; total: number }> {
  const table = db.tables.find((item) => item.name === tableName);
  if (!table) throw new Error(`Таблица "${tableName}" не найдена`);
  if (BLOB_TABLES.has(tableName)) {
    throw new Error('Просмотр fileStorage отключён, чтобы не загружать Blob в память.');
  }

  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const total = await table.count();
  const rows = await table.toCollection().offset(safeOffset).limit(safeLimit).toArray();

  return {
    total,
    records: rows.map((value: any, index) => ({
      key: String(value?.id ?? value?.key ?? safeOffset + index),
      value,
    })),
  };
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} КБ`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} МБ`;
  return `${(bytes / 1024 ** 3).toFixed(2)} ГБ`;
}

export function formatStorageValue(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (typeof Blob !== 'undefined' && item instanceof Blob) {
      return `[Blob ${item.type || 'unknown'}; ${formatBytes(item.size)}]`;
    }
    if (item instanceof Date) return item.toISOString();
    return item;
  }, 2) ?? String(value);
}
