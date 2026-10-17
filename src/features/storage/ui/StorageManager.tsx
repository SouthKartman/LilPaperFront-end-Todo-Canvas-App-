// features/storage/ui/StorageManager/StorageManager.tsx
import React, { useCallback, useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { TodoStorage } from "@shared/api/storage/jsonStorage/todoStorage";
import { ImageStorage } from "@shared/api/storage/jsonStorage/imageStorage";
import { TodoIndexedDBStorage } from "@shared/api/storage/indexedDB/todoStorage";
import { ImageIndexedDBStorage } from "@shared/api/storage/indexedDB/imageStorage";
import { ProjectIndexedDBStorage } from "@shared/api/storage/indexedDB/projectStorage";
import { importNodes, clearAllNodes } from "@features/todo-nodes/model/slice";
import { clearAllImages } from "@features/image-upload/model/slice";
import {
  loadProjectState,
  setCurrentProject,
} from "@features/project-management/model/slice";
import { RootState } from "@shared/lib/state/store";
import { db } from "@shared/api/storage/indexedDB/schema";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { StorageDiagnostics } from "./StorageDiagnostics";
import "./StorageManager.css";
import {
  Archive,
  BarChart3,
  Check,
  ChevronRight,
  Database,
  Download,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Layers3,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
// import { useAppModal } from "@/shared/ui/kit/Modal/AppModal";

interface StorageStats {
  localStorage: {
    todos: number;
    images: number;
    project: boolean;
    lastSave: Date | null;
    imageSize: number;
  };
  tableCounts: { name: string; count: number; color?: string }[];
  usageBytes: number;
  quotaBytes: number;
  indexedDB: {
    todos: number;
    images: number;
    projects: number;
    pages: number;
    canvases: number;
    imageSize: number;
    dbSize?: string;
  };
}

interface StorageManagerProps {
  modalMode?: boolean;
  onClose?: () => void;
  onImportComplete?: () => void;
  onProjectCreated?: (projectId: string) => void;
}

type ActionCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  loading?: boolean;
};

const ActionCard: React.FC<ActionCardProps> = ({
  icon,
  title,
  description,
  onClick,
  disabled,
  danger,
  loading,
}) => (
  <Button
    type="button"
    variant="outline"
    disabled={disabled}
    onClick={onClick}
    className={`group h-auto min-h-[108px] w-full justify-start gap-4 whitespace-normal rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${danger ? "border-destructive/20 hover:border-destructive/50 hover:bg-destructive/5" : "hover:border-violet-300"}`}
  >
    <span
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${danger ? "bg-destructive/10 text-destructive" : "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"}`}
    >
      {loading ? <Loader2 className="size-5 animate-spin" /> : icon}
    </span>
    <span className="min-w-0 flex-1">
      <span
        className={`flex items-center justify-between gap-2 text-sm font-semibold ${danger ? "text-destructive" : "text-foreground"}`}
      >
        {title}
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </span>
      <span className="mt-1.5 block text-xs font-normal leading-relaxed text-muted-foreground">
        {description}
      </span>
    </span>
  </Button>
);

export const StorageManager: React.FC<StorageManagerProps> = ({
  modalMode = false,
  onClose,
  onImportComplete,
  onProjectCreated,
}) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const todoNodes = useSelector((state: RootState) => state.todoNodes.nodes);
  const imageNodes = useSelector((state: RootState) => state.imageNodes.nodes);
  const project = useSelector((state: RootState) => state.project);
  const todoCount = Object.keys(todoNodes).length;
  const imageCount = Object.keys(imageNodes).length;
  const pageCount = Object.keys(project.pages || {}).length;
  const currentProject = project.projects[project.currentProjectId || ""];
  const [stats, setStats] = useState<StorageStats>({
    localStorage: {
      todos: 0,
      images: 0,
      project: false,
      lastSave: null,
      imageSize: 0,
    },
    tableCounts: [],
    usageBytes: 0,
    quotaBytes: 0,
    indexedDB: {
      todos: 0,
      images: 0,
      projects: 0,
      pages: 0,
      canvases: 0,
      imageSize: 0,
    },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [activeStorage, setActiveStorage] = useState<
    "localStorage" | "indexedDB" | "both"
  >("both");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const refreshPage = useCallback(() => {
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, []);
  const loadStats = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const localTodos = TodoStorage.loadTodos();
      const localImages = ImageStorage.loadImages();
      const localProject = localStorage.getItem("project_state");
      const localLastSave = TodoStorage.getLastSave();
      const localImageStats = ImageStorage.getStats();
      const tableCounts = await Promise.all(
        db.tables.map(async (table) => ({
          name: table.name,
          count: await table.count(),
        })),
      );
      const estimate = await navigator.storage?.estimate?.();
      const usageBytes = estimate?.usage ?? 0;
      const quotaBytes = estimate?.quota ?? 0;
      const [idbTodos, idbImages, idbProjects, idbPages, idbCanvases] =
        await Promise.all([
          db.todos.count(),
          db.images.count(),
          db.projects.count(),
          db.pages.count(),
          db.canvases.count(),
        ]);
      const idbFiles = await db.fileStorage.toArray();
      const idbImageSize = idbFiles.reduce(
        (acc, file) => acc + (file.size || 0),
        0,
      );
      let dbSize = "N/A";
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage) {
          const usageMB = estimate.usage / (1024 * 1024);
          dbSize = `${usageMB.toFixed(2)} MB`;
        }
      }
      setStats({
        localStorage: {
          todos: Object.keys(localTodos).length,
          images: Object.keys(localImages).length,
          project: !!localProject,
          lastSave: localLastSave,
          imageSize: localImageStats.totalSize || 0,
        },
        tableCounts,
        usageBytes,
        quotaBytes,
        indexedDB: {
          todos: idbTodos,
          images: idbImages,
          projects: idbProjects,
          pages: idbPages,
          canvases: idbCanvases,
          imageSize: idbImageSize,
          dbSize,
        },
      });
      if (idbTodos > 0 || idbImages > 0) {
        setActiveStorage(idbTodos > 0 ? "indexedDB" : "both");
      } else if (Object.keys(localTodos).length > 0) {
        setActiveStorage("localStorage");
      }
    } catch (error) {
      console.error("Ошибка загрузки статистики:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);
  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // Закрытие модального окна клавишей Escape.
  useEffect(() => {
    if (!modalMode || !onClose) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !showConfirmDialog) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalMode, onClose, showConfirmDialog]);

  // ============ ЭКСПОРТ ============
  const handleExport = useCallback(async () => {
    if (!currentProject) {
      alert("Нет активного проекта");
      return;
    }
    if (!imageCount && !todoCount) {
      alert("Нет данных для экспорта");
      return;
    }
    setIsExporting(true);
    setProgress(0);
    setProgressMessage("Подготовка данных...");
    try {
      const zip = new JSZip();
      setProgress(10);
      setProgressMessage("Сбор метаданных...");
      const exportData = {
        version: "3.0",
        exportDate: new Date().toISOString(),
        project: {
          id: currentProject.id,
          name: currentProject.name,
          exportedAt: Date.now(),
        },
        stats: {
          todoCount,
          imageCount,
          pageCount,
          totalSize: 0,
        },
        data: {
          todoNodes: todoNodes,
          imageNodes: imageNodes,
          project: {
            currentProjectId: project.currentProjectId,
            projects: project.projects || {},
            pages: project.pages || {},
            canvases: project.canvases || {},
          },
        },
      };
      setProgress(20);
      setProgressMessage("Получение изображений...");
      const allFiles = await db.fileStorage.toArray();
      const imageFiles = allFiles.filter((file) =>
        file.mimeType?.startsWith("image/"),
      );
      const imagesFolder = zip.folder("images");
      let processedFiles = 0;
      let totalSize = 0;
      for (const file of imageFiles) {
        try {
          const safeFileName = `${file.projectId}_${file.fileName}`;
          imagesFolder?.file(safeFileName, file.blob);
          totalSize += file.size;
          processedFiles++;
          const percent =
            20 + (processedFiles / Math.max(1, imageFiles.length)) * 60;
          setProgress(Math.round(percent));
          setProgressMessage(
            `Добавление изображений: ${processedFiles}/${imageFiles.length}`,
          );
          if (processedFiles % 10 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        } catch (err) {
          console.error(`Ошибка добавления ${file.fileName}:`, err);
        }
      }
      exportData.stats.totalSize = totalSize;
      setProgress(85);
      setProgressMessage("Создание манифеста...");
      zip.file("project.json", JSON.stringify(exportData, null, 2));
      setProgress(90);
      setProgressMessage("Создание архива...");
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      setProgress(95);
      setProgressMessage("Сохранение файла...");
      const fileName = `${currentProject.name}_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.canvas`;
      saveAs(zipBlob, fileName);
      setProgress(100);
      setProgressMessage(
        ` Экспорт завершен! Файлов: ${processedFiles}, Размер: ${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      );
      setTimeout(() => {
        setProgress(0);
        setProgressMessage("");
      }, 3000);
      alert(` Проект "${currentProject.name}" успешно экспортирован!`);
    } catch (error) {
      console.error("Ошибка экспорта:", error);
      alert("Ошибка при экспорте проекта");
      setProgress(0);
      setProgressMessage("");
    } finally {
      setIsExporting(false);
    }
  }, [
    currentProject,
    todoNodes,
    imageNodes,
    project,
    todoCount,
    imageCount,
    pageCount,
  ]);

  // ============ ИМПОРТ ============
  // Фильтрация изображений - оставляем только те, для которых есть файлы в ZIP
  const filterImagesByFiles = useCallback(
    (
      imageNodesData: Record<string, any>,
      zipImages?: Map<string, Blob>,
    ): {
      filteredImages: Record<string, any>;
      missingCount: number;
      missingNames: string[];
    } => {
      const filteredImages: Record<string, any> = {};
      const missingNames: string[] = [];
      if (!zipImages || zipImages.size === 0) {
        // Если нет ZIP с изображениями, пропускаем все изображения
        for (const [id, imageNode] of Object.entries(imageNodesData)) {
          const fileName = (imageNode as any).originalName || "unknown";
          missingNames.push(fileName);
          console.warn(
            ` Изображение пропущено (нет файла в архиве): ${fileName}`,
          );
        }
        return {
          filteredImages: {},
          missingCount: Object.keys(imageNodesData).length,
          missingNames,
        };
      }
      for (const [id, imageNode] of Object.entries(imageNodesData)) {
        const filePath = (imageNode as any).filePath;
        const fileName =
          filePath?.split("/").pop() || (imageNode as any).originalName;
        let fileFound = false;
        // Ищем файл в ZIP
        for (const [storedFileName] of zipImages) {
          if (
            storedFileName.includes(fileName) ||
            storedFileName === fileName
          ) {
            fileFound = true;
            break;
          }
        }
        if (fileFound) {
          filteredImages[id] = imageNode;
        } else {
          missingNames.push((imageNode as any).originalName || fileName || id);
          console.warn(
            ` Изображение пропущено (файл не найден): ${(imageNode as any).originalName || fileName}`,
          );
        }
      }
      return {
        filteredImages,
        missingCount:
          Object.keys(imageNodesData).length -
          Object.keys(filteredImages).length,
        missingNames,
      };
    },
    [],
  );

  // Создание нового проекта
  const createNewProject = useCallback(
    async (
      todoNodesData: Record<string, any>,
      imageNodesData: Record<string, any>,
      projectStateData: any,
      projectName: string,
      zipImages?: Map<string, Blob>,
    ) => {
      const newProjectId = `proj_${Date.now()}`;
      const newProjectName = `${projectName}_${new Date().toISOString().slice(0, 10)}`;
      const now = new Date().toISOString();
      // Фильтруем изображения
      const { filteredImages, missingCount } = filterImagesByFiles(
        imageNodesData,
        zipImages,
      );
      // Создаем страницы
      const newPages: Record<string, any> = {};
      const oldPages = projectStateData.pages || {};
      const pageIdMap = new Map<string, string>();
      let pageIndex = 0;
      for (const [oldPageId, page] of Object.entries(oldPages)) {
        const newPageId = `${newProjectId}_page_${Date.now()}_${pageIndex}`;
        pageIdMap.set(oldPageId, newPageId);
        newPages[newPageId] = {
          id: newPageId,
          name: (page as any).name || `Страница ${pageIndex + 1}`,
          projectId: newProjectId,
          canvasId: `${newProjectId}_canvas_${Date.now()}_${pageIndex}`,
          metadata: {
            createdAt: now,
            updatedAt: now,
            order: pageIndex,
          },
        };
        pageIndex++;
      }
      // Создаем канвасы
      const newCanvases: Record<string, any> = {};
      const oldCanvases = projectStateData.canvases || {};
      const oldCanvasList = Object.values(oldCanvases);
      for (let i = 0; i < pageIndex; i++) {
        const newPageId = Object.keys(newPages)[i];
        const newCanvasId = `${newProjectId}_canvas_${Date.now()}_${i}`;
        const oldCanvas = oldCanvasList[i] as any;
        newCanvases[newCanvasId] = {
          id: newCanvasId,
          pageId: newPageId,
          nodes: [],
          viewport: oldCanvas?.viewport || { x: 0, y: 0, zoom: 1 },
          background: oldCanvas?.background || "#f0f0f0",
          grid: oldCanvas?.grid || {
            size: 20,
            color: "#e0e0e0",
            isVisible: true,
          },
          metadata: {
            createdAt: now,
            updatedAt: now,
          },
        };
        newPages[newPageId].canvasId = newCanvasId;
      }
      // Создаем задачи
      const newTodoNodes: Record<string, any> = {};
      const todoEntries = Object.entries(todoNodesData);
      for (let i = 0; i < todoEntries.length; i++) {
        const [oldId, todo] = todoEntries[i];
        const newId = `${newProjectId}_todo_${Date.now()}_${i}`;
        const oldPageId = (todo as any).pageId;
        const newPageId = pageIdMap.get(oldPageId) || Object.keys(newPages)[0];
        newTodoNodes[newId] = {
          id: newId,
          title: (todo as any).title || "Новая задача",
          description: (todo as any).description || "",
          status: (todo as any).status || "todo",
          priority: (todo as any).priority || "medium",
          createdAt: now,
          updatedAt: now,
          tags: (todo as any).tags || [],
          position: (todo as any).position || {
            x: 100 + i * 50,
            y: 100 + i * 50,
          },
          size: (todo as any).size || { width: 280, height: 150 },
          pageId: newPageId,
          projectId: newProjectId,
        };
      }
      // Создаем изображения (только те, для которых есть файлы)
      const newImageNodes: Record<string, any> = {};
      const imageEntries = Object.entries(filteredImages);
      for (let i = 0; i < imageEntries.length; i++) {
        const [oldId, image] = imageEntries[i];
        const newId = `${newProjectId}_img_${Date.now()}_${i}`;
        const oldPageId = (image as any).pageId;
        const newPageId = pageIdMap.get(oldPageId) || Object.keys(newPages)[0];
        newImageNodes[newId] = {
          id: newId,
          type: "image",
          position: (image as any).position || { x: 100, y: 100 },
          size: (image as any).size || { width: 300, height: 200 },
          zIndex: (image as any).zIndex || 1000,
          filePath: (image as any).filePath || "",
          originalName: (image as any).originalName || "image.jpg",
          fileSize: (image as any).fileSize || 0,
          mimeType: (image as any).mimeType || "image/jpeg",
          createdAt: now,
          updatedAt: now,
          pageId: newPageId,
          projectId: newProjectId,
        };
      }
      // Группируем ноды по страницам
      const nodesByPage: Map<string, string[]> = new Map();
      for (const [id, todo] of Object.entries(newTodoNodes)) {
        const pageId = (todo as any).pageId;
        if (!nodesByPage.has(pageId)) nodesByPage.set(pageId, []);
        nodesByPage.get(pageId)!.push(id);
      }
      for (const [id, image] of Object.entries(newImageNodes)) {
        const pageId = (image as any).pageId;
        if (!nodesByPage.has(pageId)) nodesByPage.set(pageId, []);
        nodesByPage.get(pageId)!.push(id);
      }
      // Обновляем канвасы
      for (const [canvasId, canvas] of Object.entries(newCanvases)) {
        const pageId = (canvas as any).pageId;
        const nodeIds = nodesByPage.get(pageId) || [];
        newCanvases[canvasId] = { ...canvas, nodes: nodeIds };
      }
      // Сохраняем в базу
      for (const page of Object.values(newPages)) await db.pages.put(page);
      for (const canvas of Object.values(newCanvases))
        await db.canvases.put(canvas);
      if (Object.keys(newTodoNodes).length > 0)
        await db.todos.bulkPut(Object.values(newTodoNodes));
      if (Object.keys(newImageNodes).length > 0)
        await db.images.bulkPut(Object.values(newImageNodes));
      await db.projects.put({
        id: newProjectId,
        name: newProjectName,
        pageIds: Object.keys(newPages),
        currentPageId: Object.keys(newPages)[0] || null,
        createdAt: now,
        updatedAt: now,
        metadata: { createdAt: now, updatedAt: now },
      });
      return {
        newProjectId,
        newProjectName,
        todoNodes: newTodoNodes,
        imageNodes: newImageNodes,
        pages: newPages,
        canvases: newCanvases,
        missingImagesCount: missingCount,
      };
    },
    [filterImagesByFiles],
  );

  // Добавление к существующему проекту
  const addToExistingProject = useCallback(
    async (
      targetProjectId: string,
      todoNodesData: Record<string, any>,
      imageNodesData: Record<string, any>,
      projectStateData: any,
      zipImages?: Map<string, Blob>,
    ) => {
      const now = new Date().toISOString();
      const existingProject = await db.projects.get(targetProjectId);
      if (!existingProject) throw new Error("Проект не найден");
      // Фильтруем изображения
      const { filteredImages, missingCount } = filterImagesByFiles(
        imageNodesData,
        zipImages,
      );
      const existingPages = await db.pages
        .where("projectId")
        .equals(targetProjectId)
        .toArray();
      const existingCanvases = await db.canvases.toArray();
      const existingPagesMap = new Map(existingPages.map((p) => [p.name, p]));
      const pageIdMap = new Map<string, string>();
      const todoIdMap = new Map<string, string>();
      const imageIdMap = new Map<string, string>();
      const existingTodos = await db.todos
        .where("projectId")
        .equals(targetProjectId)
        .toArray();
      const maxX = Math.max(...existingTodos.map((t) => t.position?.x || 0), 0);
      const maxY = Math.max(...existingTodos.map((t) => t.position?.y || 0), 0);
      const offsetX = maxX + 300;
      const offsetY = maxY + 150;
      const oldPages = projectStateData.pages || {};
      let pageIndex = existingPages.length;
      for (const [oldPageId, page] of Object.entries(oldPages)) {
        const pageName = (page as any).name || `Страница ${pageIndex + 1}`;
        let newPageId = existingPagesMap.get(pageName)?.id;
        if (!newPageId) {
          const newCanvasId = `${targetProjectId}_canvas_${Date.now()}_${pageIndex}`;
          newPageId = `${targetProjectId}_page_${Date.now()}_${pageIndex}`;
          pageIdMap.set(oldPageId, newPageId);
          await db.pages.put({
            id: newPageId,
            name: pageName,
            projectId: targetProjectId,
            canvasId: newCanvasId,
            metadata: { createdAt: now, updatedAt: now, order: pageIndex },
          });
          await db.canvases.put({
            id: newCanvasId,
            pageId: newPageId,
            nodes: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            background: "#f0f0f0",
            grid: { size: 20, color: "#e0e0e0", isVisible: true },
            metadata: { createdAt: now, updatedAt: now },
          });
          pageIndex++;
        } else {
          pageIdMap.set(oldPageId, newPageId);
        }
      }
      // Создаем новые задачи
      const todoEntries = Object.entries(todoNodesData);
      const newTodos = [];
      for (let i = 0; i < todoEntries.length; i++) {
        const [oldId, todo] = todoEntries[i];
        const newId = `${targetProjectId}_todo_${Date.now()}_${i}`;
        todoIdMap.set(oldId, newId);
        const oldPageId = (todo as any).pageId;
        const newPageId =
          pageIdMap.get(oldPageId) || existingPages[0]?.id || null;
        newTodos.push({
          id: newId,
          title: (todo as any).title || "Новая задача",
          description: (todo as any).description || "",
          status: (todo as any).status || "todo",
          priority: (todo as any).priority || "medium",
          createdAt: now,
          updatedAt: now,
          tags: (todo as any).tags || [],
          position: {
            x: ((todo as any).position?.x || 100) + offsetX,
            y: ((todo as any).position?.y || 100) + offsetY,
          },
          size: (todo as any).size || { width: 280, height: 150 },
          pageId: newPageId,
          projectId: targetProjectId,
        });
      }
      // Создаем новые изображения (только те, для которых есть файлы)
      const imageEntries = Object.entries(filteredImages);
      const newImages = [];
      for (let i = 0; i < imageEntries.length; i++) {
        const [oldId, image] = imageEntries[i];
        const newId = `${targetProjectId}_img_${Date.now()}_${i}`;
        imageIdMap.set(oldId, newId);
        const oldPageId = (image as any).pageId;
        const newPageId =
          pageIdMap.get(oldPageId) || existingPages[0]?.id || null;
        newImages.push({
          id: newId,
          type: "image",
          position: {
            x: ((image as any).position?.x || 100) + offsetX,
            y: ((image as any).position?.y || 100) + offsetY,
          },
          size: (image as any).size || { width: 300, height: 200 },
          zIndex: (image as any).zIndex || 1000,
          filePath: (image as any).filePath || "",
          originalName: (image as any).originalName || "image.jpg",
          fileSize: (image as any).fileSize || 0,
          mimeType: (image as any).mimeType || "image/jpeg",
          createdAt: now,
          updatedAt: now,
          pageId: newPageId,
          projectId: targetProjectId,
        });
      }
      if (newTodos.length > 0) await db.todos.bulkPut(newTodos);
      if (newImages.length > 0) await db.images.bulkPut(newImages);
      // Группируем новые ноды по страницам
      const nodesByPage: Map<string, string[]> = new Map();
      for (const todo of newTodos) {
        if (!nodesByPage.has(todo.pageId)) nodesByPage.set(todo.pageId, []);
        nodesByPage.get(todo.pageId)!.push(todo.id);
      }
      for (const image of newImages) {
        if (!nodesByPage.has(image.pageId)) nodesByPage.set(image.pageId, []);
        nodesByPage.get(image.pageId)!.push(image.id);
      }
      // Обновляем канвасы
      const existingCanvasesMap = new Map(
        existingCanvases.map((c) => [c.pageId, c]),
      );
      for (const [pageId, nodeIds] of nodesByPage) {
        const existingCanvas = existingCanvasesMap.get(pageId);
        if (existingCanvas) {
          await db.canvases.update(existingCanvas.id, {
            nodes: [...(existingCanvas.nodes || []), ...nodeIds],
            updatedAt: now,
          });
        }
      }
      await db.projects.update(targetProjectId, {
        updatedAt: now,
        metadata: { ...existingProject.metadata, updatedAt: now },
      });
      return {
        addedTodos: newTodos.length,
        addedImages: newImages.length,
        missingImagesCount: missingCount,
      };
    },
    [filterImagesByFiles],
  );

  // Завершение импорта
  const completeImport = useCallback(
    async (result: any, isNewProject: boolean, targetProjectId?: string) => {
      setProgress(80);
      setProgressMessage("Обновление состояния...");
      const allProjects = await db.projects.toArray();
      const projectsMap = allProjects.reduce(
        (acc, p) => {
          acc[p.id] = p;
          return acc;
        },
        {} as Record<string, any>,
      );
      const allPages = await db.pages.toArray();
      const pagesMap = allPages.reduce(
        (acc, p) => {
          acc[p.id] = p;
          return acc;
        },
        {} as Record<string, any>,
      );
      const allCanvases = await db.canvases.toArray();
      const canvasesMap = allCanvases.reduce(
        (acc, c) => {
          acc[c.id] = c;
          return acc;
        },
        {} as Record<string, any>,
      );
      const newProjectId = result.newProjectId || targetProjectId;
      const newProjectName =
        result.newProjectName ||
        result.project?.name ||
        "Импортированный проект";
      const missingImagesCount = result.missingImagesCount || 0;
      if (isNewProject && result.todoNodes) {
        dispatch(importNodes(result.todoNodes));
        dispatch({
          type: "imageNodes/importImages",
          payload: result.imageNodes,
        });
      }
      dispatch(
        loadProjectState({
          currentProjectId: newProjectId,
          projects: projectsMap,
          pages: pagesMap,
          canvases: canvasesMap,
          projectOrder: allProjects.map((p) => p.id),
        }),
      );
      if (isNewProject) dispatch(setCurrentProject(newProjectId));
      await loadStats();
      setProgress(100);
      const addedMessage = result.addedTodos
        ? `Добавлено задач: ${result.addedTodos}, изображений: ${result.addedImages}`
        : "";
      const missingMessage =
        missingImagesCount > 0
          ? `\n\n Пропущено изображений: ${missingImagesCount} (файлы не найдены)`
          : "";
      setProgressMessage(` Импорт завершен! ${addedMessage}${missingMessage}`);
      setTimeout(() => {
        setProgress(0);
        setProgressMessage("");
      }, 3000);
      const message = isNewProject
        ? ` Новый проект "${newProjectName}" создан!\n\n Задач: ${Object.keys(result.todoNodes || {}).length}\n Изображений: ${Object.keys(result.imageNodes || {}).length}\n Страниц: ${Object.keys(result.pages || {}).length}${missingMessage}\n\n Страница будет обновлена...`
        : ` Проект обновлен!\n\n${addedMessage}${missingMessage}\n\n Страница будет обновлена...`;
      alert(message);
      if (modalMode && onClose) onClose();
      if (onImportComplete) onImportComplete();
      if (isNewProject && onProjectCreated) onProjectCreated(newProjectId);
      refreshPage();
    },
    [
      dispatch,
      loadStats,
      modalMode,
      onClose,
      onImportComplete,
      onProjectCreated,
      refreshPage,
    ],
  );

  // Основная функция импорта
  const performImport = useCallback(
    async (importData: any, zipImages?: Map<string, Blob>) => {
      setIsImporting(true);
      setProgress(0);
      setProgressMessage("Обработка данных...");
      try {
        const todoNodesData =
          importData.data?.todoNodes || importData.todoNodes || {};
        const imageNodesData =
          importData.data?.imageNodes || importData.imageNodes || {};
        const projectStateData =
          importData.data?.project || importData.project || {};
        const projectName =
          projectStateData.projects?.[projectStateData.currentProjectId]
            ?.name ||
          importData.stats?.projectName ||
          "Импортированный проект";
        const sourceProjectId =
          importData.project?.id || projectStateData.currentProjectId;
        setProgress(20);
        setProgressMessage(
          `Анализ данных: ${Object.keys(todoNodesData).length} задач, ${Object.keys(imageNodesData).length} изображений`,
        );
        const existingProject = sourceProjectId
          ? await db.projects.get(sourceProjectId)
          : null;
        if (existingProject && Object.keys(todoNodesData).length > 0) {
          setShowConfirmDialog(true);
          setPendingImportData({
            importData,
            todoNodesData,
            imageNodesData,
            projectStateData,
            projectName,
            sourceProjectId,
            zipImages,
          });
          setIsImporting(false);
          return;
        } else {
          setProgress(30);
          setProgressMessage(`Создание нового проекта...`);
          const result = await createNewProject(
            todoNodesData,
            imageNodesData,
            projectStateData,
            projectName,
            zipImages,
          );
          await completeImport(result, true);
        }
      } catch (error) {
        console.error(" Ошибка импорта:", error);
        alert(
          ` Ошибка при импорте:\n${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
        );
        setProgress(0);
        setProgressMessage("");
      } finally {
        if (!showConfirmDialog) setIsImporting(false);
      }
    },
    [createNewProject, completeImport],
  );

  const handleConfirmAddToExisting = useCallback(async () => {
    if (!pendingImportData) return;
    setShowConfirmDialog(false);
    setIsImporting(true);
    setProgress(0);
    setProgressMessage("Добавление к существующему проекту...");
    try {
      const {
        todoNodesData,
        imageNodesData,
        projectStateData,
        sourceProjectId,
        zipImages,
      } = pendingImportData;
      const result = await addToExistingProject(
        sourceProjectId,
        todoNodesData,
        imageNodesData,
        projectStateData,
        zipImages,
      );
      await completeImport(result, false, sourceProjectId);
    } catch (error) {
      console.error(" Ошибка добавления:", error);
      alert(
        ` Ошибка при добавлении:\n${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
      );
    } finally {
      setIsImporting(false);
      setPendingImportData(null);
    }
  }, [pendingImportData, addToExistingProject, completeImport]);

  const handleConfirmCreateNew = useCallback(async () => {
    if (!pendingImportData) return;
    setShowConfirmDialog(false);
    setIsImporting(true);
    setProgress(0);
    setProgressMessage("Создание нового проекта...");
    try {
      const {
        todoNodesData,
        imageNodesData,
        projectStateData,
        projectName,
        zipImages,
      } = pendingImportData;
      const result = await createNewProject(
        todoNodesData,
        imageNodesData,
        projectStateData,
        projectName,
        zipImages,
      );
      await completeImport(result, true);
    } catch (error) {
      console.error(" Ошибка создания проекта:", error);
      alert(
        ` Ошибка при создании проекта:\n${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
      );
    } finally {
      setIsImporting(false);
      setPendingImportData(null);
    }
  }, [pendingImportData, createNewProject, completeImport]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.name.endsWith(".canvas") && !file.name.endsWith(".json")) {
        alert("Пожалуйста, выберите файл проекта (.canvas или .json)");
        event.target.value = "";
        return;
      }
      setProgress(0);
      setProgressMessage("Чтение файла...");
      try {
        let projectData: any;
        let zipImages: Map<string, Blob> | undefined;
        if (file.name.endsWith(".canvas")) {
          const zip = await JSZip.loadAsync(file);
          const manifestFile = zip.file("project.json");
          if (!manifestFile) throw new Error("project.json не найден в архиве");
          projectData = JSON.parse(await manifestFile.async("string"));
          // Извлекаем изображения из ZIP
          const imagesFolder = zip.folder("images");
          if (imagesFolder) {
            zipImages = new Map();
            const imageFiles = Object.values(imagesFolder.files).filter(
              (f) => !f.dir,
            );
            for (const imageFile of imageFiles) {
              try {
                const blob = await imageFile.async("blob");
                zipImages.set(imageFile.name, blob);
              } catch (err) {
                console.warn(
                  `Не удалось прочитать файл ${imageFile.name}:`,
                  err,
                );
              }
            }
            console.log(` Найдено изображений в ZIP: ${zipImages.size}`);
          }
        } else {
          projectData = JSON.parse(await file.text());
        }
        await performImport(projectData, zipImages);
      } catch (error) {
        console.error(" Ошибка чтения файла:", error);
        alert(
          ` Ошибка при чтении файла:\n${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
        );
      } finally {
        event.target.value = "";
      }
    },
    [performImport],
  );

  // ============ ОСТАЛЬНЫЕ ФУНКЦИИ ============
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const successTodos = TodoStorage.saveTodos(todoNodes);
      const successImages = ImageStorage.saveImages(imageNodes);
      const projectState = {
        currentProjectId: project.currentProjectId,
        projects: project.projects || {},
        pages: project.pages || {},
        canvases: project.canvases || {},
      };
      const successProject = TodoStorage.saveProjectState(projectState);
      await TodoIndexedDBStorage.saveTodos(todoNodes);
      await ImageIndexedDBStorage.saveImages(imageNodes);
      await ProjectIndexedDBStorage.saveProject(projectState);
      await loadStats();
      const savedCount =
        (successTodos ? Object.keys(todoNodes).length : 0) +
        (successImages ? Object.keys(imageNodes).length : 0);
      alert(` Сохранено в оба хранилища: ${savedCount} элементов`);
    } catch (error) {
      console.error(" Ошибка сохранения:", error);
      alert("Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  }, [todoNodes, imageNodes, project, loadStats]);

  const handleMigrate = useCallback(async () => {
    if (
      !window.confirm(
        "Перенести данные из localStorage в IndexedDB? Старые данные останутся как резервная копия.",
      )
    )
      return;
    setIsSaving(true);
    try {
      const localTodos = TodoStorage.loadTodos();
      const localImages = ImageStorage.loadImages();
      const localProjectStr = localStorage.getItem("project_state");
      const localProject = localProjectStr ? JSON.parse(localProjectStr) : null;
      if (Object.keys(localTodos).length > 0)
        await TodoIndexedDBStorage.saveTodos(localTodos);
      if (Object.keys(localImages).length > 0)
        await ImageIndexedDBStorage.saveImages(localImages);
      if (localProject) await ProjectIndexedDBStorage.saveProject(localProject);
      await loadStats();
      alert(
        ` Миграция завершена! Перенесено: ${Object.keys(localTodos).length} задач, ${Object.keys(localImages).length} изображений`,
      );
    } catch (error) {
      console.error(" Ошибка миграции:", error);
      alert("Ошибка при миграции");
    } finally {
      setIsSaving(false);
    }
  }, [loadStats]);

  const handleClearIndexedDB = useCallback(async () => {
    if (
      !window.confirm(
        "Очистить все таблицы IndexedDB? Это действие нельзя отменить.",
      )
    ) {
      return;
    }
    try {
      await db.transaction("rw", db.tables, async () => {
        await Promise.all(db.tables.map((table) => table.clear()));
      });
      await loadStats();
      alert("IndexedDB очищена");
    } catch (error) {
      console.error("Ошибка очистки IndexedDB:", error);
      alert("Ошибка при очистке IndexedDB");
    }
  }, [loadStats]);

  const handleClearLocalStorage = useCallback(() => {
    if (window.confirm("Удалить все данные из Redux и localStorage?")) {
      dispatch(clearAllNodes());
      dispatch(clearAllImages());
      TodoStorage.clearAll();
      ImageStorage.clearAll();
      loadStats();
      alert(" localStorage и Redux очищены");
    }
  }, [dispatch, loadStats]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Никогда";
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const containerClass = modalMode
    ? "storage-manager storage-manager-modal"
    : "storage-manager";
  const [activeTab, setActiveTab] = useState<
    "overview" | "diagnostics" | "actions"
  >("overview");

  return (
    <div className={containerClass}>
      <div className="mx-auto flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden border border-slate-200 bg-white text-slate-900 shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold tracking-tight">
                Управление хранилищем
              </h2>
            </div>
          </div>
        </header>

        {showConfirmDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="storage-import-title"
          >
            <Card className="w-full max-w-lg shadow-2xl">
              <CardHeader>
                <CardTitle
                  id="storage-import-title"
                  className="flex items-center gap-2"
                >
                  <Archive className="size-5 text-violet-600" />
                  Импорт проекта
                </CardTitle>
                <CardDescription>
                  Проект с таким ID уже существует. Выберите способ импорта.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="h-auto w-full justify-between whitespace-normal py-4"
                  onClick={handleConfirmAddToExisting}
                >
                  <span className="text-left">
                    <span className="block">Добавить к существующему</span>
                    <span className="mt-1 block text-xs font-normal opacity-80">
                      Добавить новые данные к текущему проекту
                    </span>
                  </span>
                  <ChevronRight className="ml-3 size-4 shrink-0" />
                </Button>
                <Button
                  variant="secondary"
                  className="h-auto w-full justify-between whitespace-normal py-4"
                  onClick={handleConfirmCreateNew}
                >
                  <span className="text-left">
                    <span className="block">Создать новый проект</span>
                    <span className="mt-1 block text-xs font-normal opacity-80">
                      Импортировать данные в отдельный проект
                    </span>
                  </span>
                  <ChevronRight className="ml-3 size-4 shrink-0" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setPendingImportData(null);
                    setIsImporting(false);
                  }}
                >
                  Отмена
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "overview" | "diagnostics" | "actions")
          }
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="border-b border-slate-100 px-4 sm:px-6 w-0.5">
            <TabsList className="h-9 w-full justify-start gap-1 rounded-none bg-transparent p-0">
              <TabsTrigger
                value="overview"
                className="TabsButton gap-1 rounded-none border-b-2 border-transparent px-2 text-xs text-slate-500 data-[state=active]:border-fuchsia-500 data-[state=active]:bg-transparent data-[state=active]:text-fuchsia-600"
              >
                <BarChart3 className="size-4" />
                Обзор
              </TabsTrigger>
              <TabsTrigger
                value="diagnostics"
                className=" TabsButton gap-1 rounded-none border-b-2 border-transparent px-2 text-xs text-slate-500 data-[state=active]:border-fuchsia-500 data-[state=active]:bg-transparent data-[state=active]:text-fuchsia-600"
              >
                <Layers3 className="size-4" />
                Таблицы и метрики
              </TabsTrigger>
              {/* <TabsTrigger
                value="actions"
                className="gap-1 rounded-none border-b-2 border-transparent px-2 text-xs text-slate-500 data-[state=active]:border-fuchsia-500 data-[state=active]:bg-transparent data-[state=active]:text-fuchsia-600"
              >
                <HardDrive className="size-4" />
                Действия
              </TabsTrigger> */}
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 p-4 sm:p-5">
            <TabsContent
              value="overview"
              className="mt-0 space-y-5 focus-visible:outline-none"
            >
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <Card className="rounded-xl border-slate-200 shadow-sm">
                  <CardContent className="p-3.5">
                    <p className="text-[11px] font-medium text-slate-500">
                      Всего записей
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {stats.tableCounts
                        .reduce((sum, table) => sum + table.count, 0)
                        .toLocaleString("ru-RU")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Во всех таблицах IndexedDB
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-slate-200 shadow-sm">
                  <CardContent className="p-3.5">
                    <p className="text-[11px] font-medium text-slate-500">
                      Таблиц
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {stats.tableCounts.length}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      В текущей схеме базы
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-slate-200 shadow-sm">
                  <CardContent className="p-3.5">
                    <p className="text-[11px] font-medium text-slate-500">
                      Использование origin
                    </p>
                    <p className="mt-1 text-lg font-bold text-fuchsia-600">
                      {formatFileSize(stats.usageBytes)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Оценка браузера
                    </p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-slate-200 shadow-sm">
                  <CardContent className="p-3.5">
                    <p className="text-[11px] font-medium text-slate-500">
                      Квота origin
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {stats.quotaBytes
                        ? formatFileSize(stats.quotaBytes)
                        : "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Доступный лимит хранилища
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-xl border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 px-5 pb-1 pt-5">
                  <div>
                    <CardTitle className="text-sm font-semibold">
                      Распределение записей по таблицам
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Всего {stats.tableCounts.length} таблиц в IndexedDB
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-4 pt-3">
                  {stats.tableCounts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Нет данных о таблицах
                    </p>
                  ) : (
                    <ChartContainer
                      config={{
                        count: { label: "Записи", color: "#000" },
                      }}
                      className="h-[220px] w-full"
                    >
                      <BarChart
                        accessibilityLayer
                        data={stats.tableCounts
                          .slice()
                          .sort((a, b) => b.count - a.count)}
                        margin={{ top: 10, right: 4, left: -24, bottom: 0 }}
                      >
                        <CartesianGrid
                          vertical={false}
                          stroke="#dbe4f0"
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={{ stroke: "#dbe4f0" }}
                          tickMargin={10}
                          tick={{ fontSize: 10, fill: "#718096" }}
                          interval={0}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          allowDecimals={false}
                        />
                        <ChartTooltip
                          cursor={{ fill: "rgba(217,70,239,0.06)" }}
                          content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar
                          dataKey="count"
                          name="Записи"
                          fill="url(#storageBarGradient)"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={34}
                        />
                        <defs>
                          <linearGradient
                            id="storageBarGradient"
                            x1="0"
                            y1="1"
                            x2="0"
                            y2="0"
                          >
                            <stop offset="0%" stopColor="#7C3AED" />
                            <stop offset="100%" stopColor="#7C3AED" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-sm">
                        Текущее состояние (Redux)
                      </CardTitle>
                      <CardDescription>
                        Данные, загруженные в память приложения
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Задачи</span>
                      <Check className="size-4" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold tabular-nums">
                      {todoCount}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Страницы</span>
                      <FileText className="size-4" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold tabular-nums">
                      {pageCount}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Изображения</span>
                      <ImageIcon className="size-4" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold tabular-nums">
                      {imageCount}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-xl border border-violet-200 bg-violet-50/70 p-4 dark:bg-violet-950/20">
                    <div className="flex items-center justify-between text-xs text-violet-700 dark:text-violet-300">
                      <span>Активный проект</span>
                      <Archive className="size-4" />
                    </div>
                    <p
                      className="mt-3 truncate text-sm font-semibold"
                      title={currentProject?.name}
                    >
                      {currentProject?.name || "Не выбран"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="storage-manager__idb-metrics">
                <CardHeader className="storage-manager__idb-metrics-header">
                  <div className="storage-manager__idb-metrics-title">
                    <div>
                      <CardTitle className="text-sm">
                        Метрики IndexedDB
                      </CardTitle>
                      <CardDescription className="text-[10px]">
                        Количество записей в таблицах текущей базы
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void loadStats()}
                    disabled={isRefreshing}
                    aria-label="Обновить метрики IndexedDB"
                  >
                    <RefreshCw
                      className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
                    />
                  </Button>
                </CardHeader>
                <CardContent className="storage-manager__idb-metrics-grid">
                  {[
                    {
                      label: "Задачи",
                      value: stats.indexedDB.todos,
                      icon: Check,
                    },
                    {
                      label: "Изображения",
                      value: stats.indexedDB.images,
                      icon: ImageIcon,
                    },
                    {
                      label: "Проекты",
                      value: stats.indexedDB.projects,
                      icon: Archive,
                    },
                    {
                      label: "Страницы",
                      value: stats.indexedDB.pages,
                      icon: FileText,
                    },
                    {
                      label: "Полотна",
                      value: stats.indexedDB.canvases,
                      icon: Layers3,
                    },
                    {
                      label: "Узлы",
                      value:
                        stats.tableCounts.find(
                          (table) => table.name === "nodes",
                        )?.count ?? 0,
                      icon: Database,
                    },
                  ].map(({ label, value, icon: MetricIcon }) => (
                    <div key={label} className="storage-manager__idb-metric">
                      <div className="storage-manager__idb-metric-label">
                        <span>{label}</span>
                        <MetricIcon className="size-3.5 shrink-0" />
                      </div>
                      <p className="storage-manager__idb-metric-value">
                        {value.toLocaleString("ru-RU")}
                      </p>
                    </div>
                  ))}
                </CardContent>
                <div className="storage-manager__idb-metrics-footnote">
                  Оценочный объём данных IndexedDB:{" "}
                  <strong>{formatFileSize(stats.usageBytes)}</strong>. Это
                  оценка всего хранилища origin браузера, а не точный размер
                  одной базы.
                </div>
              </Card>

              <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-gradient-to-r from-fuchsia-50/60 to-white px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div>
                      <CardTitle className="text-sm">
                        Использование хранилища браузера
                      </CardTitle>
                      <CardDescription className="text-[10px]">
                        Оценка браузера, не размер одной базы
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 p-5">
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-6">
                    <div className="space-y-1">
                      <div className="mb-3 flex items-center gap-3">
                        <div>
                          <p className="text-sm font-semibold">localStorage</p>
                        </div>
                      </div>
                      {[
                        ["Задачи:", String(stats.localStorage.todos)],
                        ["Изображения:", String(stats.localStorage.images)],
                        ["Проект:", stats.localStorage.project ? "Есть" : "—"],
                        ["Последнее:", formatDate(stats.localStorage.lastSave)],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between border-b border-slate-100 py-3 text-xs last:border-0"
                        >
                          <span className="text-slate-500">{label}</span>
                          <span className="font-medium text-slate-400">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <div className="mb-3 flex items-center gap-3">
                        <div>
                          <p className="text-sm font-semibold">IndexedDB</p>
                        </div>
                      </div>
                      {[
                        ["Задачи:", String(stats.indexedDB.todos)],
                        ["Изображения:", String(stats.indexedDB.images)],
                        ["Проектов:", String(stats.indexedDB.projects)],
                        ["Страниц:", String(stats.indexedDB.pages)],
                        ["Полотен:", String(stats.indexedDB.canvases)],
                        ["Размер БД:", formatFileSize(stats.usageBytes)],
                      ].map(([label, value], i) => (
                        <div
                          key={label}
                          className="flex items-center justify-between border-b border-slate-100 py-3 text-xs last:border-0"
                        >
                          <span className="text-slate-500">{label}</span>
                          <span
                            className={`font-semibold ${i === 5 ? "text-slate-600" : "text-slate-900"}`}
                          >
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-5">
                    <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Текущее состояние (Redux)
                    </h4>
                    <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                      {[
                        ["Задач в памяти:", String(todoCount)],
                        ["Изображений в памяти:", String(imageCount)],
                        ["Страниц в памяти:", String(pageCount)],
                        [
                          "Активный проект:",
                          currentProject?.name || "Не выбран",
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 text-xs"
                        >
                          <span className="text-slate-500">{label}</span>
                          <span
                            className="max-w-[60%] truncate text-right font-semibold text-slate-900"
                            title={value}
                          >
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-violet-200 bg-gradient-to-r from-violet-50/80 to-background dark:from-violet-950/30">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                      <Database className="size-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          Активное хранилище:{" "}
                          {activeStorage === "localStorage"
                            ? "localStorage"
                            : activeStorage === "indexedDB"
                              ? "IndexedDB"
                              : "localStorage + IndexedDB"}
                        </h3>
                        {/* <Badge variant="secondary">
                          {stats.indexedDB.todos > 0 ||
                          stats.indexedDB.images > 0
                            ? "Данные в IndexedDB"
                            : stats.localStorage.todos > 0 ||
                                stats.localStorage.images > 0
                              ? "Нужна проверка миграции"
                              : "Нет данных"}
                        </Badge> */}
                      </div>
                      {/* <p className="mt-1 text-sm text-muted-foreground">
                        Экспорт проекта в .canvas (ZIP с JSON и файлами
                        изображений)
                      </p> */}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted-foreground">
                      Последнее сохранение
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {formatDate(stats.localStorage.lastSave)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {(isExporting || isImporting) && (
                <Card>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {progressMessage ||
                          (isExporting ? "Экспорт проекта" : "Импорт проекта")}
                      </span>
                      <span className="font-medium tabular-nums">
                        {progress}%
                      </span>
                    </div>
                    <Progress
                      value={progress}
                      className="h-2 [&>div]:bg-violet-500"
                    />
                  </CardContent>
                </Card>
              )}

              <section className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <ActionCard
                    icon={<Save className="size-5" />}
                    title={isSaving ? "Сохранение..." : "Сохранить все"}
                    description="Сохранить текущее состояние в локальные хранилища"
                    disabled={isSaving || isExporting || isImporting}
                    onClick={() => void handleSave()}
                    loading={isSaving}
                  />
                  <ActionCard
                    icon={<Download className="size-5" />}
                    title={isExporting ? "Экспорт..." : "Экспорт проекта"}
                    description="Скачать архив .canvas с данными проекта"
                    disabled={
                      isSaving ||
                      isExporting ||
                      isImporting ||
                      (todoCount === 0 && imageCount === 0)
                    }
                    onClick={() => void handleExport()}
                    loading={isExporting}
                  />
                  <ActionCard
                    icon={<Upload className="size-5" />}
                    title={isImporting ? "Импорт..." : "Импорт проекта"}
                    description="Загрузить данные из архива .canvas или JSON"
                    disabled={isExporting || isImporting}
                    onClick={() => fileInputRef.current?.click()}
                  />
                  <ActionCard
                    icon={<RefreshCw className="size-5" />}
                    title="Миграция"
                    description={
                      stats.indexedDB.todos > 0
                        ? "В IndexedDB уже есть задачи — проверьте таблицы перед повторной миграцией"
                        : "Перенести данные из старого хранилища в IndexedDB"
                    }
                    disabled={
                      isSaving ||
                      isExporting ||
                      isImporting ||
                      stats.indexedDB.todos > 0
                    }
                    onClick={() => void handleMigrate()}
                  />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".canvas,.json"
                  className="hidden"
                />
              </section>

              <Separator />
              <section className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <ActionCard
                    danger
                    icon={<Trash2 className="size-5" />}
                    title="Очистить IndexedDB"
                    description="Удалить записи из всех таблиц IndexedDB. Действие необратимо."
                    disabled={isSaving || isExporting || isImporting}
                    onClick={() => void handleClearIndexedDB()}
                  />
                  <ActionCard
                    danger
                    icon={<Trash2 className="size-5" />}
                    title="Очистить localStorage и Redux"
                    description="Очистить старые данные localStorage и сбросить данные в памяти приложения."
                    disabled={isSaving || isExporting || isImporting}
                    onClick={handleClearLocalStorage}
                  />
                </div>
              </section>
            </TabsContent>

            <TabsContent
              value="diagnostics"
              className="mt-0 focus-visible:outline-none"
            >
              <StorageDiagnostics />
            </TabsContent>

            {/* <TabsContent
              value="actions"
              className="mt-0 space-y-6 focus-visible:outline-none"
            ></TabsContent> */}
          </div>
        </Tabs>
      </div>
    </div>
  );
};
