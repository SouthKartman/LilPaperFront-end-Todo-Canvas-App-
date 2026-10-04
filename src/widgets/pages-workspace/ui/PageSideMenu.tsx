import "./PageSideMenu.css";
import React, { useState } from "react";
import {
  selectCurrentProject,
  selectProjectPages,
  selectCurrentPageId,
  setPageName,
  // setProjectName,
} from "@features/project-management";
import { useAppDispatch, useAppSelector } from "@shared/lib/state/store";

import { closestCenter, DndContext, DragEndEvent } from "@dnd-kit/core";
//import { SortableContext } from "@dnd-kit/sortable";
import {
  addPage,
  switchPage,
  setProjectName,
  reorderPages,
  deletePageFromDB,
  renameProjectInDB,
} from "@features/project-management";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PageItem } from "./PageItem";

export const PageSideMenu: React.FC = () => {
  // code
  const dispatch = useAppDispatch();
  const currentProject = useAppSelector(selectCurrentProject);
  const pages = useAppSelector(selectProjectPages);
  const currentPageId = useAppSelector(selectCurrentPageId);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [isRenamingProject, setIsRenamingProject] = useState<boolean>(false);
  const [projectName, setProjectNameInput] = useState<string>(
    currentProject?.name || "",
  );

  if (!currentProject) {
    return <div>404 Not Found Pages</div>;
  }

  const handleAddPage = (): void => {
    dispatch(
      addPage({
        projectId: currentProject.id,
        name: `Page ${pages.length + 1}`,
      }),
    );
  };

  const handleSwitchPage = (pageId: string): void => {
    dispatch(
      switchPage({
        projectId: currentProject.id,
        pageId,
      }),
    );
  };

  const handleRenamePage = (pageId: string, newName: string): void => {
    dispatch(setPageName({ pageId, name: newName }));
  };

  // fix typen in slice project manager
  const handleDeletePage = async (pageId: string): Promise<void> => {
    if (pages.length > 1) {
      await dispatch(
        deletePageFromDB({
          projectId: currentProject.id,
          pageId,
        }),
      ).unwrap();
    }
  };

  const handleStartRenameProject = (): void => {
    setProjectNameInput(currentProject.name);
    setIsRenamingProject(true);
  };

  const handleRenameProject = async (): Promise<void> => {
    if (projectName.trim() && projectName.trim() !== currentProject.name) {
      const newName = projectName.trim();

      // Redux
      dispatch(
        setProjectName({
          projectId: currentProject.id,
          name: newName,
        }),
      );

      // indexedDB
      await dispatch(
        renameProjectInDB({
          projectId: currentProject.id,
          name: newName,
        }),
      ).unwrap();

      setIsRenamingProject(false);
    }
  };

  const handleCancelRenameProject = (): void => {
    setIsRenamingProject(false);
    setProjectNameInput(currentProject.name);
  };

  const handleProjectNameKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (e.key === "Enter") {
      void handleRenameProject();
    }
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const fromIndex = pages.findIndex((p) => p.id === active.id);
      const toIndex = pages.findIndex((p) => p.id === over.id);

      if (fromIndex !== -1 && toIndex !== -1) {
        dispatch(
          reorderPages({
            projectId: currentProject.id,
            fromIndex,
            toIndex,
          }),
        );
      }
    }
  };

  // Markdown
  return (
    <div className="PageSideMenu">
      <button className="PageSideMenu__titleContainer">
        <h4>
          {isRenamingProject ? (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectNameInput(e.target.value)}
              onBlur={handleRenameProject}
              onKeyDown={handleProjectNameKeyDown}
              autoFocus
            />
          ) : (
            <div
              onDoubleClick={handleStartRenameProject}
              title="Double-click to rename"
            >
              {currentProject.name}
            </div>
          )}
        </h4>
        <div className="PageSideMenu__titleContainer-desc">
          <span>Project Type: Self hosted</span>
        </div>
      </button>
      <hr></hr>
      <div className="PageSideMenu__Content">
        <div className="PageSideMenu__PagesContainer">
          <div className="PagesContainer__title">
            <h5>Pages</h5>
            <button>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </button>
          </div>
          <div className="PageContainer__list">
            <DndContext
              onDragEnd={handleDragEnd}
              collisionDetection={closestCenter}
            >
              <SortableContext
                items={pages.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {pages.map((page) => (
                  <PageItem
                    key={page.id}
                    page={page}
                    isActive={page.id === currentPageId}
                    isRenaming={renamingPageId === page.id}
                    onSelect={() => handleSwitchPage(page.id)}
                    onRenameStart={() => setRenamingPageId(page.id)}
                    onRename={(newName) => handleRenamePage(page.id, newName)}
                    onRenameCancel={() => setRenamingPageId(null)}
                    onDelete={() => handleDeletePage(page.id)}
                  ></PageItem>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>
      <div className="PageSideMenu__LayersContainer"></div>
    </div>
  );
};
