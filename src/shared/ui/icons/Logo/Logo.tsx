// src/shared/ui/icons/Logo/Logo.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Logo.module.css';

// Простой импорт SVG как компонент
import LogoSVG from '@assets/Logo/Logo.svg?react';

interface LogoProps {
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = () => {
  const navigate = useNavigate();

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/');
  };

  return (
    <div className={styles.logoContainer}>
      <div className={styles.logo} onClick={handleLogoClick}>
        <div className={styles.logoImage}>
          <LogoSVG width="150px" height="50px"/>
        </div>
      </div>
    </div>
  );
};