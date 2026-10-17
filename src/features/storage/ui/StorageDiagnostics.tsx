import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import {
  ChevronRight,
  Database,
  FileJson2,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { db } from "@shared/api/storage/indexedDB/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type TableInfo = { name: string; count: number | null };
type RecordEntry = { key: string; value: unknown };

const getRecordKey = (value: unknown, index: number): string => {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const key = record.id ?? record.key ?? record.url ?? record.name;
    if (key !== undefined && key !== null) return String(key);
  }
  return `record-${index + 1}`;
};

const prettyJSON = (value: unknown) => {
  try {
    return JSON.stringify(
      value,
      (_key, item) => {
        if (item instanceof Blob)
          return `[Blob: ${item.type || "unknown type"}, ${item.size} bytes]`;
        if (item instanceof Date) return item.toISOString();
        if (item instanceof ArrayBuffer)
          return `[ArrayBuffer: ${item.byteLength} bytes]`;
        return item;
      },
      2,
    );
  } catch {
    return String(value);
  }
};

export const StorageDiagnostics: FC = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<RecordEntry | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [recordSearch, setRecordSearch] = useState("");
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    setIsLoadingTables(true);
    setError(null);

    try {
      // Render the schema first. Do not make the table list depend on count().
      await db.open();
      const definitions = [...db.tables];
      const initialTables: TableInfo[] = definitions.map((table) => ({
        name: table.name,
        count: null,
      }));

      setTables(initialTables);
      setSelectedTable((current) =>
        current && initialTables.some((table) => table.name === current)
          ? current
          : (initialTables[0]?.name ?? ""),
      );

      // Count tables independently so one failing table cannot hide the schema.
      for (const definition of definitions) {
        try {
          const count = await definition.count();
          setTables((current) =>
            current.map((table) =>
              table.name === definition.name ? { ...table, count } : table,
            ),
          );
        } catch (cause) {
          console.error(
            `[StorageDiagnostics] Failed to count table "${definition.name}"`,
            cause,
          );
          setTables((current) =>
            current.map((table) =>
              table.name === definition.name
                ? { ...table, count: null }
                : table,
            ),
          );
        }
      }
    } catch (cause) {
      console.error("[StorageDiagnostics] Failed to open IndexedDB", cause);
      setTables([]);
      setSelectedTable("");
      setError(
        cause instanceof Error ? cause.message : "Не удалось открыть IndexedDB",
      );
    } finally {
      setIsLoadingTables(false);
    }
  }, []);

  const loadRecords = useCallback(async (tableName: string) => {
    if (!tableName) {
      setRecords([]);
      return;
    }
    setIsLoadingRecords(true);
    setError(null);
    try {
      const table = db.tables.find((item) => item.name === tableName);
      if (!table) throw new Error(`Таблица «${tableName}» не найдена`);
      const values: unknown[] = await table.toArray();
      setRecords(
        values.map((value, index) => ({
          key: getRecordKey(value, index),
          value,
        })),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Не удалось прочитать записи таблицы",
      );
      setRecords([]);
    } finally {
      setIsLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    void loadTables();
  }, [loadTables]);
  useEffect(() => {
    void loadRecords(selectedTable);
  }, [loadRecords, selectedTable]);

  const visibleTables = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tables.filter(
      (table) => !query || table.name.toLowerCase().includes(query),
    );
  }, [tables, search]);

  const visibleRecords = useMemo(() => {
    const query = recordSearch.trim().toLowerCase();
    if (!query) return records;
    return records.filter(
      (record) =>
        record.key.toLowerCase().includes(query) ||
        prettyJSON(record.value).toLowerCase().includes(query),
    );
  }, [records, recordSearch]);

  const totalRecords = tables.reduce(
    (sum, table) => sum + (table.count ?? 0),
    0,
  );
  const selectedCount = tables.find(
    (table) => table.name === selectedTable,
  )?.count;

  return (
    <div className="storage-diagnostics">
      <div className="storage-diagnostics__stats">
        <Card className="storage-diagnostics__stat">
          <CardContent className="storage-diagnostics__stat-content">
            <p className="storage-diagnostics__stat-label">Таблиц</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {tables.length}
            </p>
          </CardContent>
        </Card>
        <Card className="storage-diagnostics__stat">
          <CardContent className="storage-diagnostics__stat-content">
            <p className="storage-diagnostics__stat-label">Всего записей</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {totalRecords.toLocaleString("ru-RU")}
            </p>
          </CardContent>
        </Card>
        <Card className="storage-diagnostics__stat">
          <CardContent className="storage-diagnostics__stat-content">
            <p className="storage-diagnostics__stat-label">Выбранная таблица</p>
            <p
              className="mt-1 truncate text-base font-semibold"
              title={selectedTable}
            >
              {selectedTable || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="storage-diagnostics__workspace">
        <Card className="storage-diagnostics__panel storage-diagnostics__table-panel">
          <CardHeader className="storage-diagnostics__panel-header">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Таблицы IndexedDB</CardTitle>
                <CardDescription className="mt-1 text-xs">
                  Выберите таблицу для просмотра
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => void loadTables()}
                disabled={isLoadingTables}
                aria-label="Обновить таблицы"
              >
                <RefreshCw
                  className={`size-4 ${isLoadingTables ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Найти таблицу..."
                className="pl-9"
              />
            </div>
          </CardHeader>
          <Separator />
          <ScrollArea className="storage-diagnostics__table-scroll">
            {isLoadingTables ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Чтение таблиц...
              </div>
            ) : visibleTables.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Таблицы не найдены
              </p>
            ) : (
              <div className="storage-diagnostics__table-list">
                {visibleTables.map((table) => {
                  const active = table.name === selectedTable;
                  return (
                    <button
                      key={table.name}
                      type="button"
                      onClick={() => {
                        setSelectedTable(table.name);
                        setSelectedRecord(null);
                        setRecordSearch("");
                      }}
                      className={`storage-diagnostics__table-row ${active ? "is-active" : ""}`}
                    >
                      <span className="storage-diagnostics__table-name">
                        <Database className="storage-diagnostics__table-icon" />
                        <span>{table.name}</span>
                      </span>
                      <Badge
                        variant="secondary"
                        className="storage-diagnostics__count"
                      >
                        {table.count === null ? "—" : table.count}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className="storage-diagnostics__panel storage-diagnostics__records-panel">
          <CardHeader className="storage-diagnostics__panel-header storage-diagnostics__records-header">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <CardTitle className="truncate font-mono text-sm">
                  {selectedTable || "Выберите таблицу"}
                </CardTitle>
                {/* {selectedTable && (
                  <Badge variant="secondary">
                    {selectedCount === null || selectedCount === undefined
                      ? "Подсчёт недоступен"
                      : `${selectedCount} записей`}
                  </Badge>
                )} */}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={recordSearch}
                onChange={(event) => setRecordSearch(event.target.value)}
                placeholder="Найти запись или содержимое..."
                className="pl-9"
                disabled={!selectedTable}
              />
            </div>
          </CardHeader>
          <Separator />
          <div className="storage-diagnostics__records-body">
            {isLoadingRecords ? (
              <div className="flex h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Чтение записей...
              </div>
            ) : visibleRecords.length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
                <FileJson2 className="size-8 opacity-40" />
                <p>
                  {selectedTable
                    ? "Записи не найдены"
                    : "Выберите таблицу слева"}
                </p>
              </div>
            ) : (
              <ScrollArea className="storage-diagnostics__records-scroll">
                <div className="storage-diagnostics__record-list">
                  {visibleRecords.map((record, index) => (
                    <div
                      key={`${record.key}-${index}`}
                      className="storage-diagnostics__record-row"
                    >
                      <button
                        type="button"
                        className="storage-diagnostics__record-main"
                        onClick={() => setSelectedRecord(record)}
                      >
                        <span className="storage-diagnostics__record-icon">
                          <FileJson2 />
                        </span>
                        <span className="storage-diagnostics__record-text">
                          <span
                            className="storage-diagnostics__record-key"
                            title={record.key}
                          >
                            {record.key}
                          </span>
                          <span className="storage-diagnostics__record-subtitle">
                            Запись {index + 1}
                          </span>
                        </span>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="storage-diagnostics__json-button"
                        onClick={() => setSelectedRecord(record)}
                      >
                        JSON
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </Card>
      </div>

      {selectedRecord && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр JSON записи"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedRecord(null);
          }}
        >
          <Card className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden shadow-2xl">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b p-4">
              <div className="min-w-0">
                <CardTitle className="text-sm">JSON записи</CardTitle>
                <CardDescription className="mt-1 truncate font-mono text-xs">
                  {selectedRecord.key}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => setSelectedRecord(null)}
                aria-label="Закрыть JSON"
              >
                <X className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="min-h-0 overflow-auto bg-muted/20 p-4">
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                {prettyJSON(selectedRecord.value)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StorageDiagnostics;
