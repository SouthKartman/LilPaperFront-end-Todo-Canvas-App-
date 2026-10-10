
import { useCallback, useMemo } from "react";

export interface SpatialNode {
    id: string;
    position: {
        x: number;
        y: number;
    };
    size?: {
        width: number;
        height: number;
    };
    width?: number;
    height?: number;
}

export interface SpatialBounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

const CELL_SIZE = 500;

function getNodeSize(node: SpatialNode) {
    return {
        width: node.size?.width ?? node.width ?? 200,
        height: node.size?.height ?? node.height ?? 150,
    };
}

function getCellKey(x: number, y: number) {
    return `${x}:${y}`;
}

export function useSpatialIndex<T extends SpatialNode>(
    nodes: T[],
) {
    const index = useMemo(() => {
        const orderById = new Map<string, number>();
        const cells = new Map<string, Set<string>>();
        const nodesById = new Map<string, T>();
        const nodeCells = new Map<string, string[]>();

        const addToCell = (key: string, id: string) => {
            let cell = cells.get(key);

            if (!cell) {
                cell = new Set<string>();
                cells.set(key, cell);
            }

            cell.add(id);
        };

        for (const node of nodes) {
            orderById.set(node.id, orderById.size);
            nodesById.set(node.id, node);

            const { width, height } = getNodeSize(node);
            const { x, y } = node.position;

            const minCellX = Math.floor(x / CELL_SIZE);
            const minCellY = Math.floor(y / CELL_SIZE);
            const maxCellX = Math.floor((x + width) / CELL_SIZE);
            const maxCellY = Math.floor((y + height) / CELL_SIZE);

            const keys: string[] = [];

            for (let cx = minCellX; cx <= maxCellX; cx++) {
                for (let cy = minCellY; cy <= maxCellY; cy++) {
                    const key = getCellKey(cx, cy);
                    addToCell(key, node.id);
                    keys.push(key);
                }
            }

            nodeCells.set(node.id, keys);
        }

        return { cells, nodesById, nodeCells, orderById };
    }, [nodes]);


    const query = useCallback(
        (bounds: SpatialBounds, includeIds: string[] = []): T[] => {
            const includeIdSet = new Set(includeIds);
            const minCellX = Math.floor(bounds.left / CELL_SIZE);
            const minCellY = Math.floor(bounds.top / CELL_SIZE);
            const maxCellX = Math.floor(bounds.right / CELL_SIZE);
            const maxCellY = Math.floor(bounds.bottom / CELL_SIZE);

            const candidateIds = new Set<string>();

            for (let cx = minCellX; cx <= maxCellX; cx++) {
                for (let cy = minCellY; cy <= maxCellY; cy++) {
                    const cell = index.cells.get(getCellKey(cx, cy));

                    if (!cell) continue;

                    for (const id of cell) {
                        candidateIds.add(id);
                    }
                }
            }

            // Сохраняем выбранные и другие явно закреплённые узлы.
            for (const id of includeIds) {
                if (index.nodesById.has(id)) {
                    candidateIds.add(id);
                }
            }

            const result: T[] = [];

            for (const id of candidateIds) {
                const node = index.nodesById.get(id);
                if (!node) continue;

                // Закреплённые узлы остаются видимыми даже вне viewport.
                if (includeIdSet.has(id)) {
                    result.push(node);
                    continue;
                }

                const { width, height } = getNodeSize(node);
                const { x, y } = node.position;

                const intersects =
                    x + width >= bounds.left &&
                    x <= bounds.right &&
                    y + height >= bounds.top &&
                    y <= bounds.bottom;

                if (intersects) {
                    result.push(node);
                }
            }

            // Сохраняем исходный порядок отрисовки.
            result.sort(
                (a, b) =>
                    (index.orderById.get(a.id) ?? 0) -
                    (index.orderById.get(b.id) ?? 0),
            );

            return result;
        },
        [index],
    );


    return { query };
}
