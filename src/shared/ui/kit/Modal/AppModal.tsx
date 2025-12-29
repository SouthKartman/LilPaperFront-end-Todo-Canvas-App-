// src/shared/ui/kit/Modal/AppModal.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { DraggableModal } from './DraggableModal';

interface ModalContextType {
  openModal: (content: ReactNode, options?: ModalOptions) => void;
  closeModal: () => void;
}

interface ModalOptions {
  title?: string;
  width?: string;
  height?: string;
  onClose?: () => void;
  initialPosition?: { x: number; y: number };
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

// ✅ Хук для использования модалки
export const useAppModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useAppModal must be used within AppModalProvider');
  }
  return context;
};

interface AppModalProviderProps {
  children: ReactNode;
}

// ✅ Провайдер для модалки
export const AppModalProvider: React.FC<AppModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalContent, setModalContent] = useState<ReactNode>(null);
  const [modalOptions, setModalOptions] = useState<ModalOptions>({});

  const openModal = useCallback((content: ReactNode, options: ModalOptions = {}) => {
    setModalContent(content);
    setModalOptions(options);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    if (modalOptions.onClose) {
      modalOptions.onClose();
    }
    setTimeout(() => {
      setModalContent(null);
      setModalOptions({});
    }, 300);
  }, [modalOptions]);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      {/* ✅ Встраиваем DraggableModal прямо здесь, а не отдельным компонентом */}
      <DraggableModal
        isOpen={isOpen}
        onClose={closeModal}
        title={modalOptions.title}
        width={modalOptions.width}
        height={modalOptions.height}
        initialPosition={modalOptions.initialPosition}
      >
        {modalContent}
      </DraggableModal>
    </ModalContext.Provider>
  );
};

// ✅ Удаляем компонент AppModal, так как он уже встроен в провайдер
// Если нужен отдельный компонент, он должен получать данные через пропсы, а не через хук