import React from "react";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { TaskItem } from "@/hooks/useFileExplorer";
import { useTranslations } from "next-intl";

interface FileBreadcrumbProps {
  currentPath: string[];
  tasks: TaskItem[];
  navigateTo: (path: string[]) => void;
}

export default function FileBreadcrumb({
  currentPath,
  tasks,
  navigateTo,
}: FileBreadcrumbProps) {
  const t = useTranslations("ProjectDetailPage.fileExplorer");

  const getTranslatedSegment = (segment: string) => {
    switch (segment) {
      case "Project":
        return t("projectFiles");
      case "Tasks":
        return t("tasks");
      case "main":
        return t("taskFiles");
      case "deliverables":
        return t("deliverables");
      default:
        return segment;
    }
  };

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem className="cursor-pointer">
          <BreadcrumbLink onClick={() => navigateTo(["root"])}>
            <Home className="h-4 w-4 mr-1" />
          </BreadcrumbLink>
        </BreadcrumbItem>

        {currentPath.slice(1).map((segment, index) => {
          const fullPath = ["root", ...currentPath.slice(1, index + 2)];
          const isLast = index === currentPath.slice(1).length - 1;

          let displayName = segment;
          if (
            segment !== "Project" &&
            segment !== "Tasks" &&
            segment !== "main" &&
            segment !== "deliverables"
          ) {
            const task = tasks.find((t) => t.id === segment);
            if (task) {
              displayName = task.title;
            }
          } else {
            displayName = getTranslatedSegment(segment);
          }

          return (
            <React.Fragment key={index}>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="cursor-pointer">
                {isLast ? (
                  <BreadcrumbPage>{displayName}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink onClick={() => navigateTo(fullPath)}>
                    {displayName}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
