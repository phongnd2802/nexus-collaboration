import { useState, useCallback } from "react";
import { Task } from "@/types/index";
import { toast } from "sonner";
import { CheckCircle2, Clock } from "lucide-react";
import React from "react";

interface UseProjectTasksProps {
  tasks: Task[];
  projectId: string;
  onTasksUpdated: (tasks: Task[]) => void;
  isAdmin: boolean;
  isEditor?: boolean;
}

export const useProjectTasks = ({
  tasks,
  projectId,
  onTasksUpdated,
  isAdmin,
  isEditor,
}: UseProjectTasksProps) => {
  const [taskBeingDragged, setTaskBeingDragged] = useState<string | null>(null);
  const [hoverColumn, setHoverColumn] = useState<string | null>(null);
  const [mobileColumnIndex, setMobileColumnIndex] = useState(0);

  const todoTasks = tasks.filter((task) => task.status === "TODO");
  const inProgressTasks = tasks.filter((task) => task.status === "IN_PROGRESS");
  const doneTasks = tasks.filter((task) => task.status === "DONE");

  const handleStatusChange = useCallback(
    async (taskId: string, newStatus: string, oldStatus?: string) => {
      try {
        const response = await fetch(`/api/tasks/update/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) throw new Error("Failed to update task status");

        const updatedTasks = tasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus as any } : task
        );
        onTasksUpdated(updatedTasks);

        toast.success(
          newStatus === "DONE" && oldStatus !== "DONE"
            ? "Task completed! 🎉"
            : "Task updated",
          {
            icon:
              newStatus === "DONE" && oldStatus !== "DONE" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-blue-500" />
              ),
          }
        );
      } catch (error) {
        console.error("Error updating task status:", error);
        toast.error("Failed to update task status");
      }
    },
    [tasks, onTasksUpdated]
  );

  const handleDragStart = useCallback(
    (taskId: string) => {
      if (!isAdmin && !isEditor) return;
      setTaskBeingDragged(taskId);
    },
    [isAdmin, isEditor]
  );

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setHoverColumn(columnId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setHoverColumn(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, newStatus: string) => {
      e.preventDefault();
      setHoverColumn(null);
      if (!taskBeingDragged || (!isAdmin && !isEditor)) return;

      const task = tasks.find((t) => t.id === taskBeingDragged);
      if (!task || task.status === newStatus) return;

      await handleStatusChange(taskBeingDragged, newStatus, task.status);
      setTaskBeingDragged(null);
    },
    [taskBeingDragged, isAdmin, isEditor, tasks, handleStatusChange]
  );

  const handlePrevColumn = useCallback(() => {
    setMobileColumnIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleNextColumn = useCallback((totalColumns: number) => {
    setMobileColumnIndex((prev) =>
      prev < totalColumns - 1 ? prev + 1 : prev
    );
  }, []);

  return {
    taskBeingDragged,
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
  };
};
