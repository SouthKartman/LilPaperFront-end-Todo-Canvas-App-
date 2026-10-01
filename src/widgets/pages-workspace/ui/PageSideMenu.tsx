import "./PageSideMenu.css";
import {
  selectCurrentProject,
  setProjectName,
} from "@features/project-management";

export const PageSideMenu: React.FC = () => {
  return (
    <div className="PageSideMenu">
      <div className="PageSideMenu__titleContainer">
      </div>
      <div className="PageSideMenu__PagesContainer"></div>
      <div className="PageSideMenu__LayersContainer"></div>
    </div>
  );
};
