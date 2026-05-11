// src/vite-env.d.ts
/// <reference types="vite/client" />

// Декларация для CSS модулей
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.sass' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.less' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Обычные CSS файлы
declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.scss' {
  const content: string;
  export default content;
}

// Изображения
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.svg?react' {
  import React from 'react';
  const Component: React.FC<React.SVGProps<SVGSVGElement>>;
  export default Component;
}

declare module '*.webp' {
  const value: string;
  export default value;
}

// Шрифты
declare module '*.woff' {
  const value: string;
  export default value;
}

declare module '*.woff2' {
  const value: string;
  export default value;
}

declare module '*.ttf' {
  const value: string;
  export default value;
}

declare module '*.eot' {
  const value: string;
  export default value;
}

// JSON
declare module '*.json' {
  const value: any;
  export default value;
}