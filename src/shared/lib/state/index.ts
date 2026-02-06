import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './store'

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// Просто добавим селектор для viewport
export const selectViewport = (state: RootState) => state.viewport

// Экспортируем store для провайдера (если нужно)
export { store } from './store'