import { useState } from "react";
import { toast } from "sonner";

interface UseAddSubtaskProps {
  taskId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function useAddSubtask({
  taskId,
  onSuccess,
  onClose,
}: UseAddSubtaskProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    priority: "MEDIUM",
    assigneeId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter subtask name");
      return;
    }

    if (!formData.assigneeId) {
      toast.error("Please select an assignee");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create subtask");
      }

      toast.success("Subtask created successfully");
      setFormData({
        name: "",
        priority: "MEDIUM",
        assigneeId: "",
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating subtask:", error);
      toast.error("Failed to create subtask");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setName = (value: string) => {
    setFormData((prev) => ({ ...prev, name: value }));
  };

  const setPriority = (value: string) => {
    setFormData((prev) => ({ ...prev, priority: value }));
  };

  const setAssigneeId = (value: string) => {
    setFormData((prev) => ({ ...prev, assigneeId: value }));
  };

  return {
    isSubmitting,
    formData,
    setName,
    setPriority,
    setAssigneeId,
    handleSubmit,
  };
}
