import React, { useState } from 'react';
import styles from './ImagePreview.module.css';

interface ImagePreviewProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  src,
  alt = '',
  width,
  height,
  className,
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  return (
    <div 
      className={`${styles.container} ${className || ''}`}
      style={{ width, height }}
    >
      {isLoading && (
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
          <span>Загрузка...</span>
        </div>
      )}
      
      {hasError ? (
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>Ошибка загрузки</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={styles.image}
          onLoad={handleLoad}
          onError={handleError}
          draggable={false}
        />
      )}
    </div>
  );
};