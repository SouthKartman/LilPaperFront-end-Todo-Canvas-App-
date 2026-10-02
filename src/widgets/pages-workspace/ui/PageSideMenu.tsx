import "./PageSideMenu.css";
import React, { useState } from "react";
import {
  selectCurrentProject,
  selectProjectPages,
  selectCurrentPageId,
  setPageName,
  // setProjectName,
} from "@features/project-management";
import { useDispatch, useSelector } from "react-redux";

import { DndContext, DragEndEvent } from "@dnd-kit/core";
//import { SortableContext } from "@dnd-kit/sortable";
import {
  addPage,
  switchPage,
  setProjectName,
  reorderPages,
  deletePageFromDB,
  renameProjectInDB,
} from "@features/project-management";

export const PageSideMenu: React.FC = () => {
  // code
  const dispatch = useDispatch();
  const currentProject = useSelector(selectCurrentProject);
  const pages = useSelector(selectProjectPages);
  const currentPageId = useSelector(selectCurrentPageId);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [isRenamingProject, setIsRenamingProject] = useState<boolean>(false);
  const [projectName, setProjectNameInput] = useState<string>(
    currentProject?.name || "",
  );

  if (!currentProject) {
    return <div>404 Not Found Pages</div>;
  }

  const handleAddPage = () => {
    dispatch(
      addPage({
        projectId: currentProject.id,
        name: `Page ${pages.length + 1}`,
      }),
    );
  };

  const handleSwitchPage = (pageId: string) => {
    dispatch(
      switchPage({
        projectId: currentProject.id,
        pageId,
      }),
    );
  };

  const handleRenamePage = (pageId: string, newName: srting) => {
    dispatch(setPageName({ pageId, name: newName }));
  };

  // fix typen in slice project manager
  const handleDeletePage = async (pageId: string, newName: string) => {
    if (pages.length > 1) {
      await dispatch(
        deletePageFromDB({
          projectId: currentProject.id,
          pageId,
        }),
      ).unwrap();
    }
  };

  const handleStartRenameProject = () => {
    setProjectNameInput(currentProject.name);
    setIsRenamingProject(true);
  };

  const handleRenameProject = async () => {
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

  const handleCancelRenameProject = () => {
    setIsRenamingProject(false);
    setProjectNameInput(currentProject.name);
  };

  const handleProjectNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCancelRenameProject();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over_id) {
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
              onBlur={handleRenamePage}
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
            <button>Создать</button>
          </div>
          <div className="PageContainer__list">
            <DndContext>
              {/* <SortableContext>

              </SortableContext> */}
            </DndContext>
          </div>
        </div>
      </div>
      <div className="PageSideMenu__LayersContainer"></div>
    </div>
  );
};
