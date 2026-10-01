export interface Project{
    id: string;
    name: string;
    pageIds: string[];
    currentPageId: string;
    createdAt: string;
    updatedAt: string;
    metadata: {
        createdAt: string;
        updatedAt: string;
    }
}

export interface Pages{
    id: string;
    name: string;
    projectId: string;
    canvasId: string;
    metadata: {
        createdAt: string;
        updatedAt: string;
        order: number;
    }
}

export interface Canvas {
    id: string;
    pageId: string;
    nodes: string[];
    viewport:{
        x:number;
        y:number;
        zoom: number;
    };
    background: string;
    grid: {
        size: number;
        color: string;
        isVisible: boolean;
    };
    metadata:
    {
        createdAt: string;
        updatedAt: string;
    }
}

export interface TodoNodes
{   id: string; 
    title: string;
    description: string;
    status: "todo" | "in-progress" | "done";
    priority: "low" | "medium" | "high" | "critical";
    createdAt: string;
    updatedAt: string;
    tags: string[];
    position: { x: number; y: number };
    size: { width: number; height: number };
    pageId: string;
    projectId: string;
}

export interface ImageNodes
{
    id: string;
    type: "image";
    position: { x: number; y: number };
    size: { width: number; height: number };
    zIndex: number;
    filePath: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    createdAt: string;
    updatedAt: string;
    pageId: string;
    alt: string;
    caption: string;
    projectId: string;
}