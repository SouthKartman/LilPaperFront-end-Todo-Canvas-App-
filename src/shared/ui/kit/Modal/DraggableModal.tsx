// src/shared/ui/kit/Modal/DraggableModal.tsx
import React, { useEffect, useRef, useState } from 'react';

interface DraggableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
  height?: string;
  initialPosition?: { x: number; y: number };
}

export const DraggableModal: React.FC<DraggableModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = '500px',
  height = 'auto',
  initialPosition
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Устанавливаем начальную позицию
  useEffect(() => {
    if (isOpen) {
      if (initialPosition) {
        setPosition(initialPosition);
      } else {
        // Центрируем модалку при открытии
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const modalWidth = parseInt(width) || 500;
        
        setPosition({
          x: (viewportWidth - modalWidth) / 2,
          y: viewportHeight * 0.1 // 10% от верха
        });
      }
    }
  }, [isOpen, initialPosition, width]);

  // Обработчики для перетаскивания
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!modalRef.current || !headerRef.current) return;
    
    const modalRect = modalRef.current.getBoundingClientRect();
    
    setDragOffset({
      x: e.clientX - modalRect.left,
      y: e.clientY - modalRect.top
    });
    
    setIsDragging(true);
    
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Проверяем границы экрана
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const modalWidth = modalRef.current?.offsetWidth || 500;
    const modalHeight = modalRef.current?.offsetHeight || 300;
    
    const boundedX = Math.max(0, Math.min(newX, viewportWidth - modalWidth));
    const boundedY = Math.max(0, Math.min(newY, viewportHeight - 100)); // Оставляем место для закрытия
    
    setPosition({ x: boundedX, y: boundedY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Добавляем/удаляем глобальные обработчики
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Блокируем скролл при открытии
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Закрытие на Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 1000,
        paddingTop: '10vh',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={modalRef}
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          backgroundColor: 'white',
          borderRadius: '12px',
          width: width,
          height: height,
          maxHeight: '80vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          cursor: isDragging ? 'grabbing' : 'default',
          userSelect: 'none',
          animation: 'modalAppear 0.3s ease',
        }}
      >
        {/* Заголовок с возможностью перетаскивания */}
        <div 
          ref={headerRef}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid #eaeaea',
            backgroundColor: '#f8f9fa',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
            position: 'relative',
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Иконка перетаскивания */}
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '4px',
            opacity: 0.6,
          }}>
            <div style={{ width: '24px', height: '3px', backgroundColor: '#adb5bd', borderRadius: '2px' }}></div>
            <div style={{ width: '24px', height: '3px', backgroundColor: '#adb5bd', borderRadius: '2px' }}></div>
            <div style={{ width: '24px', height: '3px', backgroundColor: '#adb5bd', borderRadius: '2px' }}></div>
          </div>
          
          {title && (
            <h3 style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: 600,
              flex: 1,
              textAlign: 'center',
            }}>
              {title}
            </h3>
          )}
          
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
            }}
            onMouseDown={(e) => e.stopPropagation()} // Предотвращаем перетаскивание при клике на крестик
          >
            ×
          </button>
        </div>
        
        {/* Контент модалки */}
        <div style={{ 
          padding: '24px', 
          overflow: 'auto',
          flex: 1,
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};