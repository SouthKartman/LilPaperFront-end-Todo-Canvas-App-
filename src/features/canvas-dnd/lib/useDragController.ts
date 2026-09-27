// src/features/canvas-dnd/lib/useDragController.ts
// Хук-контроллер drag-сессии для CanvasWorkspace.
//
// Оптимизация рендера при перетаскивании:
//  1. mousemove/touchmove слушаются нативно (не через React) — не вызывают render;
//  2. нода двигается напрямую через style.transform + will-change (GPU-композитинг),
//     минуя Redux и reconciliation на каждый кадр;
//  3. в стор диспатчатся только startDrag / endDrag; финальная позиция ноды
//     пишется в Redux один раз при отпускании (moveTodo / moveImageNode).

import { useCallback, useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { useAppSelector } from '@shared/lib/state'
import { startDrag, endDrag } from '../model/slice'
import {
  setDragSession,
  getDragSession,
  subscribeDragSession,
  convertScreenToCanvas,
} from './dragSession'
import { todoNodesActions } from '@features/todo-nodes/model/slice'
import { moveImageNode } from '@features/image-upload/model/slice'
import type { RootState } from '@shared/lib/state/store'

interface ViewportLike {
  position: { x: number; y: number }
  scale: number
}

const getPoint = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
  if ('touches' in e) {
    const t = e.touches[0] ?? (e as TouchEvent).changedTouches[0]
    return { x: t.clientX, y: t.clientY }
  }
  const m = e as MouseEvent
  return { x: m.clientX, y: m.clientY }
}

export interface DragController {
  registerPreview: React.MutableRefObject<HTMLDivElement | null>
}

export const useDragController = (
  canvasRef: React.RefObject<HTMLDivElement>,
  viewport: ViewportLike
): DragController => {
  const dispatch = useDispatch()

  // Стабильные ссылки на актуальные данные (обработчики не зависят от замыканий)
  const viewportRef = useRef(viewport)
  viewportRef.current = viewport

  const imageNodesRaw = useAppSelector((state: RootState) => state.imageNodes?.nodes)
  const imageIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    imageIdsRef.current = new Set(Object.keys(imageNodesRaw || {}))
  }, [imageNodesRaw])

  const todoNodesMapRef = useRef<Record<string, any>>({})
  const todoNodesRaw = useAppSelector((state: RootState) => state.todoNodes.nodes)
  useEffect(() => {
    todoNodesMapRef.current = todoNodesRaw
  }, [todoNodesRaw])

  // refs для DOM-манипуляций во время сессии
  const elRef = useRef<HTMLElement | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const basePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const rafRef = useRef<number | null>(null)
  const startedRef = useRef(false)

  const applyLivePosition = useCallback(() => {
    rafRef.current = null
    const session = getDragSession()
    const point = lastPointRef.current
    if (!session || !point || !elRef.current || !canvasRef.current) return

    const vp = viewportRef.current
    const rect = canvasRef.current.getBoundingClientRect()

    // Экранные координаты ЛВУ элемента под курсором
    const screenX = point.x - session.offsetX
    const screenY = point.y - session.offsetY

    // Переводим в координаты холста (пространство до transform контейнера)
    const canvasPos = convertScreenToCanvas(screenX, screenY, rect, vp)

    // Дельта в пикселях экрана относительно точки старта (учитывает scale!)
    const dxScreen = (canvasPos.x - basePosRef.current.x) * vp.scale
    const dyScreen = (canvasPos.y - basePosRef.current.y) * vp.scale

    elRef.current.style.transform = `translate(${dxScreen}px, ${dyScreen}px)`

    if (previewRef.current) {
      previewRef.current.style.left = `${screenX}px`
      previewRef.current.style.top = `${screenY}px`
    }
  }, [canvasRef])

  const scheduleUpdate = useCallback(
    (point: { x: number; y: number }) => {
      lastPointRef.current = point
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(applyLivePosition)
      }
    },
    [applyLivePosition]
  )

  const finishSession = useCallback(() => {
    const session = getDragSession()
    document.removeEventListener('mousemove', onDocMove)
    document.removeEventListener('touchmove', onDocMove)
    document.removeEventListener('mouseup', onDocUp)
    document.removeEventListener('touchend', onDocUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (session) {
      // Финальная позиция — ЕДИНСТВЕННАЯ запись позиции в Redux за всю сессию
      const vp = viewportRef.current
      const container = canvasRef.current
      const point = lastPointRef.current
      if (container && point) {
        const rect = container.getBoundingClientRect()
        const canvasPos = convertScreenToCanvas(
          point.x - session.offsetX,
          point.y - session.offsetY,
          rect,
          vp
        )

        if (session.nodeType === 'image') {
          // У изображения хранимая позиция = ЛВУ, оно и было под смещением курсора
          dispatch(moveImageNode({ id: session.nodeId, position: canvasPos }))
        } else {
          // Для todo-ноды храним ЛВУ; центр ноды совпадал с центром элемента
          const node = todoNodesMapRef.current[session.nodeId]
          const w = node?.size?.width || 200
          const h = node?.size?.height || 150
          dispatch(
            todoNodesActions.moveTodo({
              id: session.nodeId,
              position: { x: canvasPos.x - w / 2, y: canvasPos.y - h / 2 },
            })
          )
        }
      }

      // Снимаем live-transform ДО того, как Redux-позиция отрисуется
      if (elRef.current) {
        elRef.current.style.willChange = ''
        elRef.current.style.transform = ''
      }
      elRef.current = null
      previewRef.current = null
      basePosRef.current = { x: 0, y: 0 }
      lastPointRef.current = null
      startedRef.current = false
      setDragSession(null)
      dispatch(endDrag())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, canvasRef])

  // Стабильные обёртки: создаются один раз, всегда зовут актуальные колбэки
  const onDocMove = useRef((e: MouseEvent | TouchEvent) => {
    if (!getDragSession()) return
    e.preventDefault()
    scheduleUpdate(getPoint(e))
  }).current
  const onDocUp = useRef(() => finishSession()).current

  const startSession = useCallback(
    (nodeId: string, clientX: number, clientY: number) => {
      const session = getDragSession()
      if (!session || session.nodeId !== nodeId || startedRef.current || !canvasRef.current) return

      // Базовая позиция ноды в координатах холста на момент старта
      let base = { x: 0, y: 0 }
      if (session.nodeType === 'image') {
        const img = (imageNodesRaw as any)?.[nodeId]
        if (img?.position) base = { x: img.position.x, y: img.position.y }
      } else {
        const node = todoNodesMapRef.current[nodeId]
        if (node?.position) base = { ...node.position }
      }

      basePosRef.current = base
      lastPointRef.current = { x: clientX, y: clientY }
      startedRef.current = true

      dispatch(
        startDrag({
          nodeId,
          startX: clientX,
          startY: clientY,
          offsetX: session.offsetX,
          offsetY: session.offsetY,
        })
      )

      document.addEventListener('mousemove', onDocMove)
      document.addEventListener('touchmove', onDocMove, { passive: false })
      document.addEventListener('mouseup', onDocUp)
      document.addEventListener('touchend', onDocUp)
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'

      scheduleUpdate(lastPointRef.current)
    },
    [dispatch, canvasRef, imageNodesRaw, scheduleUpdate, onDocMove, onDocUp]
  )

  // Реагируем на установку/снятие живой сессии из компонентов-нод:
  // при старте — фиксируем базовую позицию и вешаем слушатели;
  // после re-render'а (startDrag) — привязываем DOM-элемент ноды по data-node-id.
  const draggedNodeId = useAppSelector((state: any) => state.canvasDnd?.drag?.draggedNodeId)

  useEffect(() => {
    const sync = () => {
      const session = getDragSession()
      if (!session) return

      // Привязка DOM-элемента (аккуратно: может появиться только после commit'а)
      if (!elRef.current && canvasRef.current) {
        const found = canvasRef.current.querySelector<HTMLElement>(
          `[data-node-id="${session.nodeId}"]`
        )
        if (found) {
          elRef.current = found
          found.style.willChange = 'transform'
        }
      }

      // Старт: offset уже посчитан компонентом, берём его из сессии;
      // координаты курсора старта = сохранённые в сессии (см. setDragSession ниже)
      if (!startedRef.current && session.startClientX != null) {
        startSession(session.nodeId, session.startClientX, session.startClientY!)
      }
    }

    const unsubscribe = subscribeDragSession(sync)
    sync()
    const timer = setTimeout(sync, 0) // повтор после commit'а React
    return () => {
      unsubscribe()
      clearTimeout(timer)
    }
  }, [canvasRef, startSession, draggedNodeId])

  // Гарантированная очистка при размонтировании воркспейса
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onDocMove)
      document.removeEventListener('touchmove', onDocMove)
      document.removeEventListener('mouseup', onDocUp)
      document.removeEventListener('touchend', onDocUp)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      setDragSession(null)
    }
  }, [onDocMove, onDocUp])

  return { registerPreview: previewRef }
}
