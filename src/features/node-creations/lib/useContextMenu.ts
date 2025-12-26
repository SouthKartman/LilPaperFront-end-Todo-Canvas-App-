import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@shared/lib/state/store';
import { hideMenu } from '../model/slice';

export const useContextMenu = () => {
  const dispatch = useDispatch<AppDispatch>();
  const menuState = useSelector((state: RootState) => state.contextMenu);

  const closeMenu = useCallback(() => {
    dispatch(hideMenu());
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
    closeMenu,
  };
};