import { useState, useEffect } from "react";
import { toast } from "sonner";

interface UseTaskCompletionProps {
  taskId: string;
  canEdit: boolean;
  existingNote?: string;
  onNoteUpdated: (note: string, deliverables: any[]) => void;
  deliverables?: any[];
}

export function useTaskCompletion({
  taskId,
  canEdit,
  existingNote,
  onNoteUpdated,
  deliverables = [],
}: UseTaskCompletionProps) {
  const [completionNote, setCompletionNote] = useState(existingNote || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deliverableFiles, setDeliverableFiles] = useState<any[]>([]);
  const [hasSavedCompletion, setHasSavedCompletion] = useState(false);

  useEffect(() => {
    // Check if completion has been saved before (existingNote is not null/undefined)
    // Empty string "" means it was saved with empty note
    const hasBeenSaved = existingNote !== null && existingNote !== undefined;
    const hasFiles = deliverables && deliverables.length > 0;
    const hasExistingData = hasBeenSaved || hasFiles;
    
    setHasSavedCompletion(hasExistingData);
    setIsEditing(canEdit && !hasExistingData);
    setCompletionNote(existingNote || "");

    if (deliverables && deliverables.length > 0) {
      setDeliverableFiles([...deliverables]);
    } else {
      setDeliverableFiles([]);
    }
  }, [canEdit, existingNote, deliverables]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCompletionNote(e.target.value);
  };

  const handleRemoveFile = async (fileUrl: string) => {
    const fileKey = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
    try {
      // delete from uploadthing (now S3)
      const uploadThingResponse = await fetch("/api/files/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey }),
      });

      if (!uploadThingResponse.ok) {
        const data = await uploadThingResponse.json();
        throw new Error(data.message || "Failed to delete file from storage");
      }

      const fileToDelete = deliverableFiles.find(
        (file) => file.url === fileUrl
      );

      // delete from database
      if (fileToDelete && fileToDelete.id) {
        const dbDeleteResponse = await fetch(
          `/api/tasks/files/${fileToDelete.id}`,
          {
            method: "DELETE",
          }
        );

        if (!dbDeleteResponse.ok) {
          const data = await dbDeleteResponse.json();
          throw new Error(
            data.message || "Failed to delete file from database"
          );
        }
      }

      setDeliverableFiles(
        deliverableFiles.filter((file) => file.url !== fileUrl)
      );

      toast.success("File removed successfully");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to remove file. Please try again.");
    }
  };

  const handleSubmit = async () => {
    if (!canEdit) return;

    setIsSaving(true);

    try {
      const uniqueFilesMap = new Map<string, any>();
      deliverableFiles.forEach((file) => {
        if (!uniqueFilesMap.has(file.url)) {
          uniqueFilesMap.set(file.url, file);
        }
      });

      const uniqueDeliverableFiles = Array.from(uniqueFilesMap.values());
      const fileData = uniqueDeliverableFiles.map((file) => ({
        name: file.name,
        url: file.url,
        size: file.size,
        type: file.type,
        key: file.key,
      }));

      const response = await fetch(`/api/tasks/complete/${taskId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completionNote,
          deliverables: fileData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update completion details");
      }

      const updatedTask = await response.json();
      
      // Update state with the latest data from server
      const updatedDeliverables = updatedTask.taskFiles?.filter(
        (file: any) => file.isTaskDeliverable
      ) || [];
      
      setCompletionNote(updatedTask.completionNote || "");
      setDeliverableFiles(updatedDeliverables);
      
      toast.success("Task completion details updated successfully");
      onNoteUpdated(updatedTask.completionNote ?? "", updatedDeliverables);

      setHasSavedCompletion(true);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating completion details:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update completion details"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnterEditMode = () => {
    setIsEditing(true);
    setCompletionNote(existingNote ?? "");
    setDeliverableFiles(deliverables ?? []);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setCompletionNote(existingNote ?? "");
    setDeliverableFiles(deliverables ?? []);
  };

  return {
    completionNote,
    isSaving,
    isEditing,
    hasSavedCompletion,
    deliverableFiles,
    setDeliverableFiles,
    handleNoteChange,
    handleRemoveFile,
    handleSubmit,
    handleEnterEditMode,
    handleCancelEdit,
  };
}
