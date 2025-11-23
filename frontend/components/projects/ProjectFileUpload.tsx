import { useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import S3Upload from "@/components/S3Upload";
import { toast } from "sonner";
import TaskAttachments from "@/components/tasks/TaskAttachments";

interface ProjectFileUploadProps {
  files: any[];
  setFiles: (files: any[]) => void;
  maxFiles?: number;
}

export default function ProjectFileUpload({
  files,
  setFiles,
  maxFiles = 5,
}: ProjectFileUploadProps) {
  const [error, setError] = useState<string | null>(null);

  const handleRemoveFile = useCallback(
    async (fileUrl: string, fileKey: string) => {
      try {
        const response = await fetch("/api/files/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKey }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to delete file");
        }

        setFiles(files.filter((file) => file.url !== fileUrl));
        toast.success("File removed successfully");
      } catch (error) {
        console.error("Error deleting file:", error);
        toast.error("Failed to remove file. Please try again.");
      }
    },
    [files, setFiles]
  );

  const handleUploadComplete = useCallback(
    (res: any) => {
      if (files.length + res.length > maxFiles) {
        setError(`You can only attach up to ${maxFiles} files`);

        res.forEach(async (file: any) => {
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
        return;
      }

      setError(null);
      const newFiles = res.map((file: any) => ({
        name: file.name,
        url: file.url,
        size: file.size,
        type: file.type,
        key: file.key,
      }));

      setFiles([...files, ...newFiles]);
      toast.success(
        `${res.length} file${res.length > 1 ? "s" : ""} uploaded successfully`
      );
    },
    [files, setFiles, maxFiles]
  );

  const handleUploadError = useCallback((error: Error) => {
    toast.error(`Upload failed: ${error.message}`);
  }, []);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-red-600 dark:text-red-400 text-sm flex items-start">
          <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {files.length > 0 && (
        <TaskAttachments files={files} onRemoveFile={handleRemoveFile} />
      )}

      {files.length < maxFiles && (
        <div className="">
          <S3Upload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            maxFiles={maxFiles - files.length}
          />
        </div>
      )}
    </div>
  );
}
