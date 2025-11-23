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
          }

          if (segment === "main") displayName = "Task Files";
          if (segment === "deliverables") displayName = "Deliverables";

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
