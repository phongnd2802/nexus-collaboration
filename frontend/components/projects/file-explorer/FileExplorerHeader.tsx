import React from "react";
import { ArrowLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FileBreadcrumb from "./FileBreadcrumb";
import { TaskItem } from "@/hooks/useFileExplorer";
import { useTranslations } from "next-intl";

interface FileExplorerHeaderProps {
  currentPath: string[];
  tasks: TaskItem[];
  hasPermissions: boolean;
  navigateUp: () => void;
  navigateTo: (path: string[]) => void;
  getCurrentLocation: () => string;
  handleFileUpload: () => void;
}

export default function FileExplorerHeader({
  currentPath,
  tasks,
  hasPermissions,
  navigateUp,
  navigateTo,
  getCurrentLocation,
  handleFileUpload,
}: FileExplorerHeaderProps) {
  const t = useTranslations("ProjectDetailPage.fileExplorer");
  const currentLocation = getCurrentLocation();

  const getTranslatedLocation = (location: string) => {
    switch (location) {
      case "root":
        return t("root");
      case "Project Files":
        return t("projectFiles");
      case "Tasks":
        return t("tasks");
      case "Task Folder":
        return t("taskFiles");
      default:
        return location;
    }
  };

  return (
    <div className="flex items-center mb-4 h-12 justify-between">
      {/* Desktop View */}
      <div className="hidden sm:flex items-center">
        <Button
          variant="neutral"
          onClick={navigateUp}
          disabled={currentPath.length <= 1}
          className="mr-2"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>

        <Badge variant="default" className="font-medium min-w-32 w-auto">
          {getTranslatedLocation(currentLocation)}
        </Badge>
        <div className="ml-4 mt-4">
          <FileBreadcrumb
            currentPath={currentPath}
            tasks={tasks}
            navigateTo={navigateTo}
          />
        </div>
      </div>

      {/* Mobile View */}
      <div className="flex sm:hidden items-center w-full">
        <Button
          variant="neutral"
          onClick={navigateUp}
          disabled={currentPath.length <= 1}
          className="mr-2 p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Badge variant="default" className="font-medium py-1.5">
          {getTranslatedLocation(currentLocation)}
        </Badge>
      </div>

      {/* Upload Button */}
      {hasPermissions && (
        <div>
          {(currentLocation === "root" ||
            currentLocation === "Project Files") && (
            <Button
              variant="default"
              className="ml-auto cursor-pointer hidden sm:flex"
              onClick={handleFileUpload}
            >
              <Upload className="h-4 w-4 mr-2" />
              {t("uploadFile")}
            </Button>
          )}

          {(currentLocation === "root" ||
            currentLocation === "Project Files") && (
            <Button
              variant="default"
              size="icon"
              className="ml-auto cursor-pointer sm:hidden"
              onClick={handleFileUpload}
            >
              <Upload className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
