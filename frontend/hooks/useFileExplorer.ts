import { useState } from "react";
import { toast } from "sonner";

export interface FileItem {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  taskId?: string | null;
  isTaskDeliverable?: boolean;
  createdAt: string;
  key?: string; // Added for uploadthing deletion
}

export interface TaskItem {
  id: string;
  title: string;
  files: FileItem[];
}

interface UseFileExplorerProps {
  projectId: string;
  initialProjectFiles: FileItem[];
  initialTasks: TaskItem[];
}

export function useFileExplorer({
  projectId,
  initialProjectFiles,
  initialTasks,
}: UseFileExplorerProps) {
  const [currentPath, setCurrentPath] = useState<string[]>(["root"]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [filesToUpload, setFilesToUpload] = useState<any[]>([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [projectFiles, setProjectFiles] =
    useState<FileItem[]>(initialProjectFiles);
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);

  const getCurrentLocation = () => {
    if (currentPath.length === 1) return "root";
    if (currentPath.length === 2 && currentPath[1] === "Project")
      return "Project Files";
    if (currentPath.length === 2 && currentPath[1] === "Tasks") return "Tasks";

    if (currentPath.length >= 3 && currentPath[1] === "Tasks") {
      const taskId = currentPath[2];
      // const task = tasks.find((t) => t.id === taskId); // Unused variable

      if (currentPath.length === 3) {
        return `Task Folder`;
      }

      if (currentPath.length === 4) {
        return currentPath[3] === "main" ? "Task Files" : "Deliverables";
      }
    }

    return "Unknown";
  };

  const navigateTo = (path: string[]) => {
    setCurrentPath(path);
    setSelectedFile(null);
  };

  const navigateUp = () => {
    if (currentPath.length > 1) {
      setCurrentPath((prev) => prev.slice(0, prev.length - 1));
      setSelectedFile(null);
    }
  };

  const getTotalFileCount = (pathType: string) => {
    if (pathType === "Project") {
      return projectFiles.length;
    } else if (pathType === "Tasks") {
      return tasks.reduce((total, task) => {
        return total + task.files.length;
      }, 0);
    }
    return 0;
  };

  const getCurrentItems = () => {
    if (currentPath.length === 1) {
      return [
        {
          id: "project-folder",
          name: "Project",
          type: "folder",
          count: getTotalFileCount("Project"),
          navigateTo: ["root", "Project"],
        },
        {
          id: "tasks-folder",
          name: "Tasks",
          type: "folder",
          count: getTotalFileCount("Tasks"),
          navigateTo: ["root", "Tasks"],
        },
      ];
    }

    // Project folder - Shows all project files
    if (currentPath.length === 2 && currentPath[1] === "Project") {
      return projectFiles.map((file) => ({
        ...file,
        type: "file",
      }));
    }

    // Tasks folder -  Shows all tasks as folders
    if (currentPath.length === 2 && currentPath[1] === "Tasks") {
      return tasks.map((task) => {
        const mainFiles = task.files.filter((f) => !f.isTaskDeliverable).length;
        const deliverables = task.files.filter(
          (f) => f.isTaskDeliverable
        ).length;
        const totalFiles = task.files.length;

        return {
          id: task.id,
          name: task.title,
          type: "folder",
          hasMain: mainFiles > 0,
          hasDeliverables: deliverables > 0,
          mainCount: mainFiles,
          deliverablesCount: deliverables,
          navigateTo: ["root", "Tasks", task.id],
          count: totalFiles,
        };
      });
    }

    // Inside a task folder - 'main' and 'deliverables' folders
    if (currentPath.length === 3 && currentPath[1] === "Tasks") {
      const taskId = currentPath[2];
      const task = tasks.find((t) => t.id === taskId);

      if (!task) return [];

      const mainFiles = task.files.filter((f) => !f.isTaskDeliverable);
      const deliverables = task.files.filter((f) => f.isTaskDeliverable);

      const folders = [];

      if (mainFiles.length > 0) {
        folders.push({
          id: "main-files",
          name: "Task Files",
          type: "folder",
          count: mainFiles.length,
          navigateTo: [...currentPath, "main"],
        });
      }

      if (deliverables.length > 0) {
        folders.push({
          id: "deliverables",
          name: "Deliverables",
          type: "folder",
          count: deliverables.length,
          navigateTo: [...currentPath, "deliverables"],
        });
      }

      return folders;
    }

    // Inside a task's main or deliverables folder - Show files
    if (currentPath.length === 4 && currentPath[1] === "Tasks") {
      const taskId = currentPath[2];
      const folderType = currentPath[3];
      const task = tasks.find((t) => t.id === taskId);

      if (!task) return [];

      if (folderType === "main") {
        return task.files
          .filter((f) => !f.isTaskDeliverable)
          .map((file) => ({
            ...file,
            type: "file",
          }));
      }

      if (folderType === "deliverables") {
        return task.files
          .filter((f) => f.isTaskDeliverable)
          .map((file) => ({
            ...file,
            type: "file",
          }));
      }
    }

    return [];
  };

  const handleDownload = (file: FileItem) => {
    window.open(file.url, "_blank");
  };

  const handleFileUpload = () => {
    setFilesToUpload([]);
    setIsUploadDialogOpen(true);
  };

  const handleDeleteFile = (file: FileItem) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    const startTime = Date.now();

    try {
      const fileKey = fileToDelete.url.split("/").pop() || "";
      // delete from project or task in db
      const isTaskFile = !!fileToDelete.taskId;
      const endpoint = isTaskFile
        ? `/api/tasks/files/${fileToDelete.id}`
        : `/api/projects/${projectId}/files/${fileToDelete.id}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete file");
      }

      // delete from uploadthing (now S3)
      await fetch("/api/files/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey: fileKey }),
      });

      if (isTaskFile && fileToDelete.taskId) {
        setTasks((prevTasks) => {
          return prevTasks.map((task) => {
            if (task.id === fileToDelete.taskId) {
              return {
                ...task,
                files: task.files.filter((file) => file.id !== fileToDelete.id),
              };
            }
            return task;
          });
        });
      } else {
        setProjectFiles((prevFiles) =>
          prevFiles.filter((file) => file.id !== fileToDelete.id)
        );
      }

      const elapsedTime = Date.now() - startTime;
      const minimumWaitTime = 600;

      if (elapsedTime < minimumWaitTime) {
        await new Promise((resolve) =>
          setTimeout(resolve, minimumWaitTime - elapsedTime)
        );
      }

      toast.success("File deleted successfully");
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file. Please try again.");
      const elapsedTime = Date.now() - startTime;
      const minimumWaitTime = 600;

      if (elapsedTime < minimumWaitTime) {
        await new Promise((resolve) =>
          setTimeout(resolve, minimumWaitTime - elapsedTime)
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitFiles = async () => {
    if (filesToUpload.length === 0) {
      toast.error("Please upload at least one file");
      return;
    }

    setIsUploading(true);

    try {
      const fileData = filesToUpload.map((file) => ({
        name: file.name,
        url: file.url,
        size: file.size,
        type: file.type,
        key: file.key,
      }));

      const response = await fetch(`/api/projects/${projectId}/files/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: fileData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to add files to project");
      }

      const responseData = await response.json();

      if (responseData.files && Array.isArray(responseData.files)) {
        setProjectFiles((prevFiles) => [...prevFiles, ...responseData.files]);
      } else {
        const now = new Date().toISOString();
        const newFiles = filesToUpload.map((file) => ({
          ...file,
          id:
            file.key ||
            `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          createdAt: now,
        }));
        setProjectFiles((prevFiles) => [...prevFiles, ...newFiles]);
      }

      toast.success(`${filesToUpload.length} file(s) added to project`);
      setIsUploadDialogOpen(false);
      setFilesToUpload([]);
    } catch (error) {
      console.error("Error adding files to project:", error);
      toast.error("Failed to add files to project. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadCancel = () => {
    if (filesToUpload.length > 0) {
      filesToUpload.forEach(async (file) => {
        try {
          await fetch("/api/files/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileKey: file.key }),
          });
        } catch (err) {
          console.error("Failed to delete excess file:", err);
        }
      });
      setFilesToUpload([]);
    }
    setIsUploadDialogOpen(false);
  };

  return {
    currentPath,
    selectedFile,
    filesToUpload,
    isUploadDialogOpen,
    isUploading,
    deleteDialogOpen,
    fileToDelete,
    isDeleting,
    projectFiles,
    tasks,
    navigateTo,
    navigateUp,
    getCurrentLocation,
    getCurrentItems,
    handleDownload,
    handleFileUpload,
    handleDeleteFile,
    confirmDeleteFile,
    handleSubmitFiles,
    handleUploadCancel,
    setFilesToUpload,
    setIsUploadDialogOpen,
    setDeleteDialogOpen,
    setSelectedFile,
  };
}
