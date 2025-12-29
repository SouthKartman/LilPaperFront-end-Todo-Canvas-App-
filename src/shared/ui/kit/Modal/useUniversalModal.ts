import { useState, useCallback } from 'react';

interface UseUniversalModalReturn {
  isOpen: boolean;
  openModal: (component: React.ReactNode, options?: ModalOptions) => void;
  closeModal: () => void;
  modalContent: React.ReactNode | null;
  modalOptions: ModalOptions;
}

interface ModalOptions {
  title?: string;
  width?: string;
  height?: string;
  onClose?: () => void;
}

export const useUniversalModal = (): UseUniversalModalReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [modalOptions, setModalOptions] = useState<ModalOptions>({});

  const openModal = useCallback((component: React.ReactNode, options: ModalOptions = {}) => {
    setModalContent(component);
    setModalOptions(options);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    if (modalOptions.onClose) {
      modalOptions.onClose();
    }
    // Очищаем контент после анимации
    setTimeout(() => {
      setModalContent(null);
      setModalOptions({});
    }, 300);
  }, [modalOptions]);

  return {
    isOpen,
    openModal,
    closeModal,
    modalContent,
    modalOptions,
  };
};