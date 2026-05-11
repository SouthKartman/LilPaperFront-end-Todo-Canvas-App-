import React, { useRef } from 'react';
import { useImageUpload } from '../lib/useImageUpload';
import styles from './ImageUploadButton.module.css';

interface ImageUploadButtonProps {
  position: { x: number; y: number };
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  className?: string;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  position,
  onUploadStart,
  onUploadEnd,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFromFile } = useImageUpload();

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    onUploadStart?.();

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Смещаем позицию для каждого следующего изображения
        const imagePosition = {
          x: position.x + i * 30,
          y: position.y + i * 30,
        };
        await uploadFromFile(file, imagePosition);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      onUploadEnd?.();
      // Очищаем input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <button
        className={`${styles.button} ${className || ''}`}
        onClick={handleClick}
        title="Загрузить изображение"
      >
        <span className={styles.icon}>🖼️</span>
        <span className={styles.text}>Добавить изображение</span>
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        multiple
        className={styles.fileInput}
        onChange={handleFileChange}
      />
    </>
  );
};