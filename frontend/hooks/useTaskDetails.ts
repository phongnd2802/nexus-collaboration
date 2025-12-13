import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Task, Project, User } from "@/types/index";

export const useTaskDetails = (taskId: string) => {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableMembers, setAvailableMembers] = useState<User[]>([]);
  const [permissionLevel, setPermissionLevel] = useState<
    "none" | "view" | "edit" | "admin"
  >("none");
  const [taskFiles, setTaskFiles] = useState<any[]>([]);
  const [taskDeliverables, setTaskDeliverables] = useState<any[]>([]);
  const [isAssignee, setIsAssignee] = useState(false);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<any[]>([]);

  const [editedTask, setEditedTask] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const getLocalHHmm = (isoString?: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const fetchProjectAndTaskDetails = useCallback(async () => {
    if (!taskId || status !== "authenticated") return;

    setIsLoading(true);
    setError(null);

    try {
      const taskResponse = await fetch(`/api/tasks/${taskId}`);

      if (!taskResponse.ok) {
        const data = await taskResponse.json();
        throw new Error(data.message || "Failed to fetch task details");
      }

      const taskData = await taskResponse.json();
      setTask(taskData);

      // Set subtasks and linked tasks from API response
      setSubtasks(taskData.subtasks || []);
      setLinkedTasks(taskData.linkedTasks || []);

      if (taskData.taskFiles && taskData.taskFiles.length > 0) {
        const attachments = taskData.taskFiles.filter(
          (file: any) => !file.isTaskDeliverable
        );
        const deliverables = taskData.taskFiles.filter(
          (file: any) => file.isTaskDeliverable
        );

        setTaskFiles(attachments);
        setTaskDeliverables(deliverables);
      } else {
        setTaskFiles([]);
        setTaskDeliverables([]);
      }

      const projectResponse = await fetch(
        `/api/projects/${taskData.project?.id}`
      );

      if (!projectResponse.ok) {
        const data = await projectResponse.json();
        throw new Error(data.message || "Failed to fetch project details");
      }
      const projectData = await projectResponse.json();
      setProject(projectData);

      if (projectData.members) {
        setAvailableMembers(
          projectData.members.map((m: { user: User }) => m.user)
        );
      }

      // user permissions
      const userId = session?.user?.id;

      // check if the user is the assignee
      const userIsAssignee = taskData.assigneeId === userId;
      setIsAssignee(userIsAssignee);

      const isAdmin =
        projectData.creatorId === userId ||
        projectData.members.some(
          (m: { userId: string; role: string }) =>
            m.userId === userId && m.role === "ADMIN"
        );

      // Editor can edit all tasks
      const isEditor = projectData.members.some(
        (m: { userId: string; role: string }) =>
          m.userId === userId && m.role === "EDITOR"
      );

      // Task creator can edit their own tasks
      const isTaskCreator = taskData.creatorId === userId;

      // Member of the project can view tasks
      const isMember = projectData.members.some(
        (m: { userId: string }) => m.userId === userId
      );

      if (isAdmin || isEditor || isTaskCreator) {
        setPermissionLevel("admin");
      } else if (userIsAssignee) {
        setPermissionLevel("edit");
      } else if (isMember) {
        setPermissionLevel("view");
      } else {
        setPermissionLevel("none");
        setError("You don't have permission to view this task.");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
      toast.error("Failed to load task details");
    } finally {
      setIsLoading(false);
    }
  }, [taskId, status, session?.user?.id]);

  useEffect(() => {
    fetchProjectAndTaskDetails();
  }, [fetchProjectAndTaskDetails]);

  useEffect(() => {
    if (task) {
      setEditedTask({
        title: task.title || "",
        description: task.description || "",
        assigneeId: task.assigneeId || "",
        dueDate: task.dueDate ? task.dueDate.substring(0, 10) : "",
        dueTime: getLocalHHmm(task.dueDate || undefined),
        priority: task.priority || "MEDIUM",
        status: task.status || "TODO",
      });
    }
  }, [task]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!editedTask.title.trim()) {
      errors.title = "Task title is required";
    } else if (editedTask.title.trim().length < 3) {
      errors.title = "Title must be at least 3 characters";
    } else if (editedTask.title.trim().length > 100) {
      errors.title = "Title must be less than 100 characters";
    }

    if (editedTask.description && editedTask.description.length > 2000) {
      errors.description = "Description must be less than 2000 characters";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (permissionLevel === "none" || permissionLevel === "view") {
      toast.error("You don't have permission to update this task");
      return;
    }

    try {
      const response = await fetch(`/api/tasks/update/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update task status");
      }

      setTask((prev: Task | null) =>
        prev ? { ...prev, status: newStatus as any } : null
      );

      if (isEditing) {
        setEditedTask((prev: any) => ({ ...prev, status: newStatus }));
      }

      toast.success("Task status updated");
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update task status"
      );
    }
  };

  const handleEditField = (field: string, value: string) => {
    setEditedTask((prev: any) => ({ ...prev, [field]: value }));

    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/tasks/update/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editedTask.title,
          description: editedTask.description,
          assigneeId: editedTask.assigneeId || null,
          dueDate: editedTask.dueDate || null,
          dueTime: editedTask.dueTime || null,
          priority: editedTask.priority,
          status: editedTask.status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update task");
      }

      const updatedTask = await response.json();

      setTask(updatedTask);

      // Exit edit mode
      setIsEditing(false);
      toast.success("Task updated successfully");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update task"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (task) {
      setEditedTask({
        title: task.title || "",
        description: task.description || "",
        assigneeId: task.assigneeId || "",
        dueDate: task.dueDate ? task.dueDate.substring(0, 10) : "",
        dueTime: getLocalHHmm(task.dueDate || undefined),
        priority: task.priority || "MEDIUM",
        status: task.status || "TODO",
      });
    }

    setValidationErrors({});

    // Exit edit mode
    setIsEditing(false);
  };

  const handleAssigneeChange = (value: string) => {
    if (value === "unassigned") {
      setEditedTask((prev: any) => ({ ...prev, assigneeId: null }));
    } else {
      setEditedTask((prev: any) => ({ ...prev, assigneeId: value }));
    }
  };

  const handleDeleteTask = async () => {
    if (permissionLevel !== "admin") {
      toast.error("You don't have permission to delete this task");
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/tasks/delete/${taskId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete task");
      }

      toast.success("Task deleted successfully");
      router.push(`/projects/${project?.id}`);
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete task"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCompletionNoteUpdate = async (
    note: string,
    deliverables: any[]
  ) => {
    setTask((prev: Task | null) =>
      prev
        ? {
            ...prev,
            completionNote: note,
          }
        : null
    );

    setTaskDeliverables(deliverables);
  };

  return {
    isLoading,
    project,
    task,
    isEditing,
    setIsEditing,
    isSaving,
    isDeleting,
    error,
    availableMembers,
    permissionLevel,
    taskFiles,
    taskDeliverables,
    isAssignee,
    subtasks,
    linkedTasks,
    editedTask,
    validationErrors,
    fetchProjectAndTaskDetails,
    handleUpdateStatus,
    handleEditField,
    handleSaveChanges,
    handleCancelEdit,
    handleAssigneeChange,
    handleDeleteTask,
    handleCompletionNoteUpdate,
  };
};
