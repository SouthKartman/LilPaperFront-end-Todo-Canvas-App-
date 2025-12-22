import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@shared/lib/state/store';
import { showMenu, hideMenu, setMenuItems } from '../model/slice';
import { MenuItemType, ShowMenuPayload } from '../model/types';

export const useContextMenu = () => {
  const dispatch = useDispatch<AppDispatch>();
  const menuState = useSelector((state: RootState) => state.contextMenu);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const payload: ShowMenuPayload = {
      x: event.clientX,
      y: event.clientY,
      context: {
        type: 'canvas',
        position: { x: event.clientX, y: event.clientY },
      },
    };
    
    dispatch(showMenu(payload));
  }, [dispatch]);

  const closeMenu = useCallback(() => {
    dispatch(hideMenu());
  }, [dispatch]);

  const updateItems = useCallback((items: MenuItemType[]) => {
    dispatch(setMenuItems(items));
  }, [dispatch]);

  // Закрытие меню по ESC или клику вне меню
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuState.isVisible) {
        closeMenu();
      }
    };

    const handleClickOutside = () => {
      if (menuState.isVisible) {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [menuState.isVisible, closeMenu]);

  return {
    isVisible: menuState.isVisible,
    position: menuState.position,
    items: menuState.items,
    context: menuState.context,
    handleContextMenu,
    closeMenu,
    updateItems,
  };
};