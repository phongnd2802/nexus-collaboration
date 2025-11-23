import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface LinkedTask {
  id: string;
  name: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  assigneeId: string;
  assignee: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  status: "TODO" | "IN_PROGRESS" | "DONE";
  relationship: "BLOCKED_BY" | "BLOCKS";
  linkedTaskId?: string;
}

interface UseLinkedTasksProps {
  taskId: string;
  linkedTasks: LinkedTask[];
  onLinkedTaskUpdated: () => void;
}

export function useLinkedTasks({
  taskId,
  linkedTasks,
  onLinkedTaskUpdated,
}: UseLinkedTasksProps) {
  const { data: session } = useSession();

  const handleUpdateLinkedTask = async (
    linkedTaskId: string,
    field: string,
    value: string
  ) => {
    try {
      // If updating relationship, use task link endpoint
      if (field === "relationship") {
        const response = await fetch(
          `/api/tasks/${taskId}/links/${linkedTaskId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ relationship: value }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update linked task relationship");
        }
      } else {
        // For other fields (priority, assignee, status), update the actual task
        // We need to get the actual task ID from linkedTask object
        const linkedTask = linkedTasks.find((lt) => lt.id === linkedTaskId);
        if (!linkedTask) return;

        const response = await fetch(
          `/api/tasks/update/${linkedTask.linkedTaskId || linkedTask.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              [field]: value,
              userId: session?.user?.id,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update linked task");
        }
      }

      toast.success("Linked task updated successfully");
      onLinkedTaskUpdated();
    } catch (error: any) {
      console.error("Error updating linked task:", error);
      toast.error(error.message || "Failed to update linked task");
    }
  };

  const handleDeleteLinkedTask = async (linkedTaskId: string) => {
    if (!confirm("Are you sure you want to remove this linked task?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/links/${linkedTaskId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete linked task");
      }

      toast.success("Linked task removed successfully");
      onLinkedTaskUpdated();
    } catch (error) {
      console.error("Error deleting linked task:", error);
      toast.error("Failed to remove linked task");
    }
  };

  return {
    handleUpdateLinkedTask,
    handleDeleteLinkedTask,
  };
}
