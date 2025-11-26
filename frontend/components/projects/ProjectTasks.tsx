import React, { useRef, useState } from "react";
import { PlusCircle, CheckCircle2, Circle, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Project, Task } from "@/types/index";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { TaskColumn } from "./tasks/TaskColumn";
import { MobileTaskView } from "./tasks/MobileTaskView";
import ProjectCompletionAlert from "./ProjectCompletionAlert";
import ProjectCompletionDialog from "./ProjectCompletionDialog";
import { toast } from "sonner";

interface ProjectTasksProps {
  id: string;
  project: Project;
  tasks: Task[];
  isAdmin: boolean;
  isEditor?: boolean;
  onTasksUpdated: (tasks: Task[]) => void;
  onProjectUpdated?: () => void;
}

export default function ProjectTasks({
  id,
  project,
  tasks,
  isAdmin,
  isEditor,
  onTasksUpdated,
  onProjectUpdated,
}: ProjectTasksProps) {
  const isMobile = useIsMobile();
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);

  const {
    hoverColumn,
    mobileColumnIndex,
    setMobileColumnIndex,
    todoTasks,
    inProgressTasks,
    doneTasks,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePrevColumn,
    handleNextColumn,
  } = useProjectTasks({
    tasks,
    projectId: id,
    onTasksUpdated,
    onProjectUpdated,
    isAdmin,
    isEditor,
  });

  const columnRefs = {
    TODO: useRef<HTMLDivElement>(null),
    IN_PROGRESS: useRef<HTMLDivElement>(null),
    DONE: useRef<HTMLDivElement>(null),
  };

  const allTasksCompleted =
    tasks.length > 0 && doneTasks.length === tasks.length;
  const showCompletionAlert =
    allTasksCompleted && project.status !== "COMPLETED" && (isAdmin || isEditor);

  const handleCompleteProject = async () => {
    setIsUpdatingProject(true);
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      if (!response.ok) {
        throw new Error("Failed to update project status");
      }

      toast.success("Project marked as completed! 🎉");
      setIsCompletionDialogOpen(false);
      if (onProjectUpdated) {
        onProjectUpdated();
      }
    } catch (error) {
      console.error("Error completing project:", error);
      toast.error("Failed to complete project");
    } finally {
      setIsUpdatingProject(false);
    }
  };

  const columns = [
    {
      title: "To Do",
      status: "TODO",
      ref: columnRefs.TODO,
      tasks: todoTasks,
      icon: <Circle className="h-4 w-4 text-gray-600 dark:text-gray-300" />,
      emptyIcon: <PlusCircle className="h-5 w-5 text-gray-400" />,
      bgColor: "bg-gray-50 dark:bg-gray-900/50",
      borderColor: "border-gray-200 dark:border-gray-700",
    },
    {
      title: "In Progress",
      status: "IN_PROGRESS",
      ref: columnRefs.IN_PROGRESS,
      tasks: inProgressTasks,
      icon: <Clock className="h-4 w-4 text-blue-600 dark:text-blue-300" />,
      emptyIcon: <Clock className="h-5 w-5 text-blue-400" />,
      bgColor: "bg-blue-50/30 dark:bg-blue-900/10",
      borderColor: "border-blue-200 dark:border-blue-800/30",
    },
    {
      title: "Done",
      status: "DONE",
      ref: columnRefs.DONE,
      tasks: doneTasks,
      icon: (
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-300" />
      ),
      emptyIcon: <CheckCircle2 className="h-5 w-5 text-green-400" />,
      bgColor: "bg-green-50/30 dark:bg-green-900/10",
      borderColor: "border-green-200 dark:border-green-800/30",
    },
  ];

  if (isMobile) {
    return (
      <>
        {showCompletionAlert && (
          <ProjectCompletionAlert
            onOpenDialog={() => setIsCompletionDialogOpen(true)}
          />
        )}
        <MobileTaskView
          columns={columns}
          mobileColumnIndex={mobileColumnIndex}
          setMobileColumnIndex={setMobileColumnIndex}
          handlePrevColumn={handlePrevColumn}
          handleNextColumn={handleNextColumn}
          isAdmin={isAdmin}
          isEditor={isEditor}
        />
        <ProjectCompletionDialog
          open={isCompletionDialogOpen}
          onOpenChange={setIsCompletionDialogOpen}
          onConfirm={handleCompleteProject}
          isUpdating={isUpdatingProject}
        />
      </>
    );
  }

  return (
    <div className="px-2 sm:px-4 md:px-6">
      {showCompletionAlert && (
        <ProjectCompletionAlert
          onOpenDialog={() => setIsCompletionDialogOpen(true)}
        />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {columns.map((column) => (
          <TaskColumn
            key={column.status}
            ref={column.ref}
            title={column.title}
            status={column.status}
            tasks={column.tasks}
            icon={column.icon}
            bgColor={column.bgColor}
            hoverColumn={hoverColumn}
            isAdmin={isAdmin}
            isEditor={isEditor}
            isMobile={isMobile}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
          />
        ))}
      </div>
      <ProjectCompletionDialog
        open={isCompletionDialogOpen}
        onOpenChange={setIsCompletionDialogOpen}
        onConfirm={handleCompleteProject}
        isUpdating={isUpdatingProject}
      />
    </div>
  );
}
