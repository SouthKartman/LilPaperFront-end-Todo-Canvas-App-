import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addPluginNode } from "@features/plugin-nodes/model/slice";
import { PluginRegistry } from "@entities/plugin-node/model/pluginRegistry";
import { nanoid } from "nanoid";
import { RootState } from "@shared/lib/state/store";
import { selectCurrentPage } from "@features/project-management/model/selectors";
import styles from "./BottomToolbar.module.css";
import { useEnhancedViewport } from "@features/canvas-viewport/lib/useTransformViewport";

interface BottomToolbarProps {
  onAddIframe?: (url: string) => void;
  getCenterPosition?: () => { x: number; y: number };
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
  onAddIframe,
  getCenterPosition,
}) => {
  const { handleToggleGrid } = useEnhancedViewport();

  const dispatch = useDispatch();
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tempUrl, setTempUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const currentPage = useSelector(selectCurrentPage);
  const viewport = useSelector((state: RootState) => state.viewport);

  const getCenterCoordinates = () => {
    if (getCenterPosition) {
      return getCenterPosition();
    }

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    if (viewport) {
      const canvasX = (centerX - viewport.position.x) / viewport.scale;
      const canvasY = (centerY - viewport.position.y) / viewport.scale;
      return { x: canvasX, y: canvasY };
    }

    return { x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 300 };
  };

  const handleAddIframe = () => {
    setShowUrlInput(true);
    setTempUrl("");
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tempUrl.trim()) return;

    let finalUrl = tempUrl.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }

    const plugin = PluginRegistry.getPlugin("iframe/website");
    console.log("Plugin found:", plugin);

    if (plugin) {
      setIsCreating(true);

      const centerPos = getCenterCoordinates();
      console.log("Center position:", centerPos);
      console.log("Current page:", currentPage?.id);

      const newNode = {
        id: nanoid(),
        pluginId: plugin.id,
        type: plugin.type,
        title: finalUrl,
        width: plugin.defaultSize.width,
        height: plugin.defaultSize.height,
        position: {
          x: centerPos.x - plugin.defaultSize.width / 2,
          y: centerPos.y - plugin.defaultSize.height / 2,
        },
        pageId: currentPage?.id || "default",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pluginProps: {
          src: finalUrl,
          sandbox:
            "allow-same-origin allow-scripts allow-popups allow-forms allow-modals",
          allow: "fullscreen; clipboard-read; clipboard-write",
          loading: "lazy",
        },
      };

      console.log("Creating node:", newNode);
      dispatch(addPluginNode(newNode));
      onAddIframe?.(finalUrl);

      setShowUrlInput(false);
      setTempUrl("");
      setIsCreating(false);
    } else {
      console.error("Plugin iframe/website not found!");
    }
  };

  const handleCancel = () => {
    setShowUrlInput(false);
    setTempUrl("");
  };

  return (
    <>
      {/* cursor */}

      <div className={styles["bottom-toolbar"]}>
        <div className={styles["toolbar-container"]}>
          <button
            className={styles["toolbar-btn"]}
            title="Добавить веб-страницу"
          >
            <span className={styles["toolbar-btn-icon"]}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />
              </svg>
            </span>
          </button>

          {/* calendar */}

          <button
            className={styles["toolbar-btn"]}
            title="Добавить веб-страницу"
          >
            <span className={styles["toolbar-btn-icon"]}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M16 14v2.2l1.6 1" />
                <path d="M16 2v3" />
                <path d="M21 7.338V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2.338" />
                <path d="M3 9h5.859" />
                <path d="M8 2v3" />
                <circle cx="16" cy="16" r="6" />
              </svg>
            </span>
          </button>

          {/* web */}

          {/* image */}
          <button
            className={styles["toolbar-btn"]}
            title="Добавить веб-страницу"
          >
            <span className={styles["toolbar-btn-icon"]}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </span>
            {/* <span className="toolbar-btn-label">Сайт</span> */}
          </button>

          {/* text */}
          <button
            className={styles["toolbar-btn"]}
            title="Добавить веб-страницу"
          >
            <span className={styles["toolbar-btn-icon"]}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 4v16" />
                <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
                <path d="M9 20h6" />
              </svg>
            </span>
            {/* <span className="toolbar-btn-label">Сайт</span> */}
          </button>

          {/* comments */}
          <button
            className={styles["toolbar-btn"]}
            title="Добавить веб-страницу"
          >
            <span className={styles["toolbar-btn-icon"]}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            {/* <span className="toolbar-btn-label">Сайт</span> */}
          </button>

          {/* frame-grid */}
          <button
            className={`${styles["toolbar-btn"]} ${viewport.showGrid ? styles["active"] : ""}`}
            onClick={handleToggleGrid}
            title="Добавить веб-страницу"
          >
            <span className={styles["toolbar-btn-icon"]}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="22" x2="2" y1="6" y2="6" />
                <line x1="22" x2="2" y1="18" y2="18" />
                <line x1="6" x2="6" y1="2" y2="22" />
                <line x1="18" x2="18" y1="2" y2="22" />
              </svg>
            </span>
            {/* <span className="toolbar-btn-label">Сайт</span> */}
          </button>

          <button
            className={styles["toolbar-btn"]}
            onClick={handleAddIframe}
            disabled={isCreating}
            title="Добавить веб-страницу"
          >
            <span className={styles["toolbar-btn-icon"]}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
              </svg>
            </span>
            {/* <span className="toolbar-btn-label">Сайт</span> */}
          </button>

          <button
            className={styles["toolbar-btn"]}
            title="Добавить веб-страницу"
          >
            <span className={styles["toolbar-btn-icon"]}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                <path d="m15 5 4 4" />
              </svg>
            </span>
            {/* <span className="toolbar-btn-label">Сайт</span> */}
          </button>
        </div>
      </div>

      {/* Modal */}

      {showUrlInput && (
        <div className={styles["url-modal"]}>
          <div className={styles["url-modal-overlay"]} onClick={handleCancel} />
          <form
            className={styles["url-modal-content"]}
            onSubmit={handleUrlSubmit}
          >
            <div className={styles["url-modal-header"]}>
              <span className={styles["url-modal-icon"]}>🌐</span>
              <h3>Добавить веб-страницу</h3>
              <button
                type="button"
                className={styles["url-modal-close"]}
                onClick={handleCancel}
              >
                &times;
              </button>
            </div>
            <div className={styles["url-modal-body"]}>
              <label htmlFor="url-input">URL-адрес страницы</label>
              <input
                id="url-input"
                type="text"
                placeholder="example.com"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                autoFocus
              />
            </div>
            <div className={styles["url-modal-footer"]}>
              <button
                type="button"
                className={styles["btn-cancel"]}
                onClick={handleCancel}
              >
                Отмена
              </button>
              <button
                type="submit"
                className={styles["btn-submit"]}
                disabled={isCreating || !tempUrl.trim()}
              >
                {isCreating ? "Создание..." : "Добавить"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
