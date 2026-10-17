import React, { useEffect, useRef, useState } from "react";

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
  width = "500px",
  height = "auto",
  initialPosition,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const dragData = useRef({
    offsetX: 0,
    offsetY: 0,
    dragging: false,
  });

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Рассчитываем положение после того, как браузер определит размеры окна.
  useEffect(() => {
    if (!isOpen) return;

    if (initialPosition) {
      setPosition(initialPosition);
      return;
    }

    const frame = requestAnimationFrame(() => {
      const modal = modalRef.current;
      if (!modal) return;

      setPosition({
        x: Math.max(0, (window.innerWidth - modal.offsetWidth) / 2),
        y: Math.max(
          0,
          Math.min(
            window.innerHeight * 0.1,
            window.innerHeight - modal.offsetHeight,
          ),
        ),
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen, initialPosition, width, height]);

  // Перетаскивание окна.
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!dragData.current.dragging) return;

      const modal = modalRef.current;
      if (!modal) return;

      const modalWidth = modal.offsetWidth;
      const modalHeight = modal.offsetHeight;

      const maxX = Math.max(0, window.innerWidth - modalWidth);
      const maxY = Math.max(0, window.innerHeight - Math.min(modalHeight, 100));

      setPosition({
        x: Math.max(
          0,
          Math.min(event.clientX - dragData.current.offsetX, maxX),
        ),
        y: Math.max(
          0,
          Math.min(event.clientY - dragData.current.offsetY, maxY),
        ),
      });
    };

    const handleMouseUp = () => {
      dragData.current.dragging = false;
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isOpen]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    // Перетаскиваем только левой кнопкой мыши.
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;

    // Кнопки и интерактивные элементы не должны начинать перетаскивание.
    if (target.closest("button, a, input, textarea, select")) return;

    const modal = modalRef.current;
    if (!modal) return;

    const rect = modal.getBoundingClientRect();

    dragData.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      dragging: true,
    };

    setIsDragging(true);
    event.preventDefault();
  };

  // Сохраняем и восстанавливаем исходное состояние прокрутки страницы.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Закрытие по Escape.
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Удерживаем окно в пределах видимой области при изменении размера окна.
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      const modal = modalRef.current;
      if (!modal) return;

      setPosition((current) => ({
        x: Math.max(
          0,
          Math.min(current.x, window.innerWidth - modal.offsetWidth),
        ),
        y: Math.max(0, Math.min(current.y, window.innerHeight - 100)),
      }));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 1000,
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        style={{
          position: "absolute",
          left: position.x,
          top: position.y,
          width,
          height,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "80vh",
          boxSizing: "border-box",
          overflow: "hidden",
          backgroundColor: "#fff",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          display: "flex",
          flexDirection: "column",
          cursor: isDragging ? "grabbing" : "default",
          animation: "modalAppear 0.3s ease",
        }}
      >
        {/* Шапка всегда видима, даже если title не задан */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            minHeight: 56,
            padding: "12px 56px",
            boxSizing: "border-box",
            borderBottom: "1px solid #eaeaea",
            backgroundColor: "#f8f9fa",
            cursor: isDragging ? "grabbing" : "grab",
            userSelect: "none",
            touchAction: "none",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 16,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {title || "Lil Paper"}
          </span>

          <button
            type="button"
            aria-label="Закрыть окно"
            title="Закрыть"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={onClose}
            style={{
              position: "absolute",
              top: "50%",
              right: 12,
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              padding: 0,
              border: 0,
              borderRadius: 8,
              background: "transparent",
              color: "#444",
              fontSize: 24,
              lineHeight: 1,
              cursor: "pointer",
              zIndex: 2,
            }}
          >
            ×
          </button>
        </div>

        {/* Содержимое окна */}
        <div
          style={{
            minHeight: 0,
            flex: 1,
            overflow: "auto",
            userSelect: "text",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
