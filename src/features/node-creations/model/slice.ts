import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ContextMenuState, ShowMenuPayload, MenuItemType } from './types';

const initialState: ContextMenuState = {
  isVisible: false,
  position: null,
  items: [],
  context: undefined,
};

export const contextMenuSlice = createSlice({
  name: 'contextMenu',
  initialState,
  reducers: {
    showMenu: (state, action: PayloadAction<ShowMenuPayload>) => {
      state.isVisible = true;
      state.position = { x: action.payload.x, y: action.payload.y };
      state.context = action.payload.context;
    },
    
    hideMenu: (state) => {
      state.isVisible = false;
      state.position = null;
      state.context = undefined;
    },
    
    setMenuItems: (state, action: PayloadAction<MenuItemType[]>) => {
      state.items = action.payload;
    },
    
    updateMenuPosition: (state, action: PayloadAction<{ x: number; y: number }>) => {
      if (state.position) {
        state.position = action.payload;
      }
    },
  },
});

export const { showMenu, hideMenu, setMenuItems, updateMenuPosition } = contextMenuSlice.actions;
export default contextMenuSlice.reducer;