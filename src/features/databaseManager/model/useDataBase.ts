import { useState, useEffect, useCallback } from "react";
import { Project, TodoNodes,ImageNodes } from "./types";


const DB_NAME = "TodoAppDatabase";
const DB_VERSION = 1;

export const useDatabase = () => {
    // Используем camelCase для всех состояний
    const [projects, setProjects] = useState<Project[]>([]);
    const [todoNodes, setTodoNodes] = useState<TodoNodes[]>([]);
    const [imageNodes, setImageNodes] = useState<ImageNodes[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const openDB = (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains("projects")) {
                    db.createObjectStore("projects", { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains("pages")) {
                    db.createObjectStore("pages", { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains("canvases")) {
                    db.createObjectStore("canvases", { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains("todoNodes")) {
                    db.createObjectStore("todoNodes", { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains("imageNodes")) {
                    db.createObjectStore("imageNodes", { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains("canvas")) {
                    db.createObjectStore("canvas", { keyPath: "id" });
                }
            };

            request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
            request.onerror = () => reject("Критическая ошибка при открытии IndexedDB");
        });
    };

    const fetchAllData = useCallback(async () => {
        try {
            setLoading(true);
            const db = await openDB();

           
            const transaction = db.transaction(["projects", "todoNodes", "imageNodes", "canvas"], "readonly");

            const projectsStore = transaction.objectStore("projects");
            const todoStore = transaction.objectStore("todoNodes");
            const imageStore = transaction.objectStore("imageNodes");
            // const canvasStore = transaction.objectStore("canvas");
            

            const reqProjects = projectsStore.getAll();
            const reqTodos = todoStore.getAll();
            const reqImages = imageStore.getAll();
            
            transaction.oncomplete = () => {
                setProjects(reqProjects.result as Project[]);
                setTodoNodes(reqTodos.result as TodoNodes[]);
                setImageNodes(reqImages.result as ImageNodes[]);
                setError(null);
                setLoading(false);
            };

            transaction.onerror = () => {
                setError("Не удалось загрузить данные из хранилищ");
                setLoading(false);
            };

        } catch (err) {
            setError(err instanceof Error ? err.message : "Неизвестная ошибка");
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    return {
        projects,
        todoNodes,
        imageNodes, 
        loading,
        error,
        refresh: fetchAllData
    };
};