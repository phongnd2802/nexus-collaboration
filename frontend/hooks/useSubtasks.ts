import { useState } from "react";
import { toast } from "sonner";

interface Subtask {
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
}

interface UseSubtasksProps {
  taskId: string;
  subtasks: Subtask[];
  onSubtaskUpdated: () => void;
}

export function useSubtasks({
  taskId,
  subtasks,
  onSubtaskUpdated,
}: UseSubtasksProps) {
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleUpdateSubtask = async (
    subtaskId: string,
    field: string,
    value: string
  ) => {
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/subtasks/${subtaskId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ [field]: value }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update subtask");
      }

      toast.success("Subtask updated successfully");
      onSubtaskUpdated();
    } catch (error: any) {
      console.error("Error updating subtask:", error);
      toast.error(error.message || "Failed to update subtask");
    }
  };

  const handleNameEdit = (subtaskId: string, currentName: string) => {
    setEditingNameId(subtaskId);
    setEditingName(currentName);
  };

  const handleNameSave = async (subtaskId: string) => {
    if (
      editingName.trim() &&
      editingName !== subtasks.find((s) => s.id === subtaskId)?.name
    ) {
      await handleUpdateSubtask(subtaskId, "name", editingName.trim());
    }
    setEditingNameId(null);
    setEditingName("");
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!confirm("Are you sure you want to delete this subtask?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/subtasks/${subtaskId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete subtask");
      }

      toast.success("Subtask deleted successfully");
      onSubtaskUpdated();
    } catch (error: any) {
      console.error("Error deleting subtask:", error);
      toast.error(error.message || "Failed to delete subtask");
    }
  };

  return {
    editingNameId,
    editingName,
    setEditingName,
    handleUpdateSubtask,
    handleNameEdit,
    handleNameSave,
    handleDeleteSubtask,
    setEditingNameId,
  };
}
