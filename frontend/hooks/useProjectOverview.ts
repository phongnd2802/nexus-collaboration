import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { ProjectWithDetails, Task } from "@/types/index";

interface UseProjectOverviewProps {
  project: ProjectWithDetails;
  tasks: Task[];
  isAdmin: boolean;
  onProjectUpdated?: () => void;
}

export function useProjectOverview({
  project,
  tasks,
  isAdmin,
  onProjectUpdated,
}: UseProjectOverviewProps) {
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showStatusPrompt, setShowStatusPrompt] = useState(false);

  // Task statistics
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.status === "DONE").length;
    const inProgressTasks = tasks.filter(
      (task) => task.status === "IN_PROGRESS"
    ).length;
    const todoTasks = tasks.filter((task) => task.status === "TODO").length;

    const completionPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      completionPercentage,
    };
  }, [tasks]);

  // Check if project is complete but status isn't set to COMPLETED
  useEffect(() => {
    if (
      stats.completionPercentage === 100 &&
      stats.totalTasks > 0 &&
      project.status !== "COMPLETED" &&
      isAdmin
    ) {
      setShowStatusPrompt(true);
    } else {
      setShowStatusPrompt(false);
    }
  }, [stats.completionPercentage, stats.totalTasks, project.status, isAdmin]);

  const handleMarkProjectCompleted = async () => {
    if (!isAdmin) return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      if (!response.ok) {
        throw new Error("Failed to update project status");
      }

      toast.success("Project marked as completed!");

      if (onProjectUpdated) {
        onProjectUpdated();
      }
    } catch (error) {
      console.error("Error updating project status:", error);
      toast.error("Failed to update project status. Please try again.");
    } finally {
      setIsUpdatingStatus(false);
      setIsCompletionDialogOpen(false);
    }
  };

  return {
    isCompletionDialogOpen,
    setIsCompletionDialogOpen,
    isUpdatingStatus,
    showStatusPrompt,
    stats,
    handleMarkProjectCompleted,
  };
}
