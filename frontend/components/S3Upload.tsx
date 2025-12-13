"use client";

import { useState, useRef } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface S3UploadProps {
  onUploadComplete: (
    res: {
      url: string;
      key: string;
      name: string;
      size: number;
      type: string;
    }[]
  ) => void;
  onUploadError: (error: Error) => void;
  onUploadBegin?: () => void;
  onUploadProgress?: (progress: number) => void;
  endpoint?: string;
  maxFiles?: number;
  accept?: string;
  className?: string;
}

export default function S3Upload({
  onUploadComplete,
  onUploadError,
  onUploadBegin,
  onUploadProgress,
  maxFiles,
  accept = "*",
  className,
}: S3UploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (maxFiles && files.length > maxFiles) {
      toast.error(`You can only upload up to ${maxFiles} files`);
      return;
    }

    setIsUploading(true);
    onUploadBegin?.();
    onUploadProgress?.(0);

    const uploadedFiles: {
      url: string;
      key: string;
      name: string;
      size: number;
      type: string;
    }[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 1. Get presigned URL
        const res = await fetch("/api/files/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, fileType: file.type }),
        });

        if (!res.ok) throw new Error("Failed to get upload URL");
        const { presignedUrl, fileKey } = await res.json();

        onUploadProgress?.(30);

        // 2. Upload to S3
        const uploadRes = await fetch(presignedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadRes.ok) throw new Error("Failed to upload file to storage");

        onUploadProgress?.(100);

        // 3. Construct URL (using our proxy route for secure access)
        const url = `/api/files/${fileKey}`;

        uploadedFiles.push({
          url: url,
          key: fileKey,
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }

      onUploadComplete(uploadedFiles);
    } catch (error) {
      console.error("Upload error:", error);
      onUploadError(
        error instanceof Error ? error : new Error("Upload failed")
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-muted-foreground/25">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {isUploading ? (
            <Loader2 className="w-8 h-8 mb-2 text-primary animate-spin" />
          ) : (
            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
          )}
          <p className="mb-2 text-sm text-muted-foreground">
            <span className="font-semibold">Click to upload</span>
          </p>
          {maxFiles && (
            <p className="text-xs text-muted-foreground">
              Max {maxFiles} file{maxFiles > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple={!maxFiles || maxFiles > 1}
          accept={accept}
          onChange={handleFileSelect}
          disabled={isUploading}
        />
      </label>
    </div>
  );
}
