import React from 'react';
import styles from './ImageDropOverlay.module.css';

interface ImageDropOverlayProps {
  isVisible: boolean;
  error?: string | null;
  onClearError?: () => void;
}

export const ImageDropOverlay: React.FC<ImageDropOverlayProps> = ({ 
  isVisible, 
  error,
  onClearError 
}) => {
  if (!isVisible && !error) return null;

  if (error) {
    return (
      <div className={`${styles.overlay} ${styles.error}`}>
        <div className={styles.errorContent}>
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorMessage}>{error}</span>
          {onClearError && (
            <button className={styles.closeButton} onClick={onClearError}>
              ×
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.overlay} ${styles.visible}`}>
      <div className={styles.content}>
        <div className={styles.icon}>🖼️</div>
        <div className={styles.title}>Перетащите изображения</div>
        <div className={styles.subtitle}>JPEG, PNG, GIF, WEBP до 10MB</div>
        <div className={styles.hint}>Можно перетащить несколько файлов сразу</div>
      </div>
    </div>
  );
};