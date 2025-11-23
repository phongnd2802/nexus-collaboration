import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
}

interface UseAddLinkedTaskProps {
  taskId: string;
  projectId: string;
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export function useAddLinkedTask({
  taskId,
  projectId,
  isOpen,
  onSuccess,
  onClose,
}: UseAddLinkedTaskProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [formData, setFormData] = useState({
    linkedTaskId: "",
    relationship: "BLOCKS",
  });

  useEffect(() => {
    if (isOpen && projectId) {
      fetchProjectTasks();
    }
  }, [isOpen, projectId]);

  const fetchProjectTasks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/project/${projectId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }
      const data = await response.json();

      // Filter out current task
      const filteredTasks = data.filter((task: Task) => task.id !== taskId);
      setProjectTasks(filteredTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.linkedTaskId) {
      toast.error("Please select a task to link");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create linked task");
      }

      toast.success("Linked task created successfully");
      setFormData({
        linkedTaskId: "",
        relationship: "BLOCKS",
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating linked task:", error);
      toast.error("Failed to create linked task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setLinkedTaskId = (value: string) => {
    setFormData((prev) => ({ ...prev, linkedTaskId: value }));
  };

  const setRelationship = (value: string) => {
    setFormData((prev) => ({ ...prev, relationship: value }));
  };

  return {
    isSubmitting,
    isLoading,
    projectTasks,
    formData,
    setLinkedTaskId,
    setRelationship,
    handleSubmit,
  };
}
