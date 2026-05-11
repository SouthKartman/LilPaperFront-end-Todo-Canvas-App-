// src/shared/ui/kit/Modal/UniversalModal.tsx
import React, { useEffect } from 'react';

interface UniversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
  height?: string;
}

export const UniversalModal: React.FC<UniversalModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = '500px',
  height = 'auto'
}) => {
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
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          width: width,
          height: height,
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        }}
      >
        {(title || true) && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid #eaeaea',
            position: 'sticky',
            top: 0,
            backgroundColor: 'white',
            zIndex: 1,
          }}>
            {title && (
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
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
              }}
            >
              ×
            </button>
          </div>
        )}
        
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
};