import React from "react";
import { useFileExplorer, FileItem, TaskItem } from "@/hooks/useFileExplorer";
import FileExplorerHeader from "./file-explorer/FileExplorerHeader";
import FileList from "./file-explorer/FileList";
import FileOperationsDialogs from "./file-explorer/FileOperationsDialogs";

interface FileExplorerProps {
  projectId: string;
  projectFiles: FileItem[];
  tasks: TaskItem[];
  hasPermissions: boolean;
}

export default function FileExplorer({
  projectId,
  projectFiles: initialProjectFiles,
  tasks: initialTasks,
  hasPermissions,
}: FileExplorerProps) {
  const {
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
  } = useFileExplorer({
    projectId,
    initialProjectFiles,
    initialTasks,
  });

  const items = getCurrentItems();

  return (
    <div className="h-full flex flex-col">
      <FileExplorerHeader
        currentPath={currentPath}
        tasks={tasks}
        hasPermissions={hasPermissions}
        navigateUp={navigateUp}
        navigateTo={navigateTo}
        getCurrentLocation={getCurrentLocation}
        handleFileUpload={handleFileUpload}
      />

      <FileList
        items={items}
        selectedFile={selectedFile}
        currentLocation={getCurrentLocation()}
        setSelectedFile={setSelectedFile}
        navigateTo={navigateTo}
        handleDownload={handleDownload}
        handleDeleteFile={handleDeleteFile}
      />

      <FileOperationsDialogs
        isUploadDialogOpen={isUploadDialogOpen}
        isUploading={isUploading}
        filesToUpload={filesToUpload}
        projectFiles={projectFiles}
        deleteDialogOpen={deleteDialogOpen}
        isDeleting={isDeleting}
        fileToDelete={fileToDelete}
        setFilesToUpload={setFilesToUpload}
        handleUploadCancel={handleUploadCancel}
        handleSubmitFiles={handleSubmitFiles}
        setDeleteDialogOpen={setDeleteDialogOpen}
        confirmDeleteFile={confirmDeleteFile}
      />
    </div>
  );
}
