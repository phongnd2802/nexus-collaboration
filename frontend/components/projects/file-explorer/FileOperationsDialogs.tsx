import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import ProjectFileUpload from "../ProjectFileUpload";
import { FileItem } from "@/hooks/useFileExplorer";
import { useTranslations } from "next-intl";

interface FileOperationsDialogsProps {
  isUploadDialogOpen: boolean;
  isUploading: boolean;
  filesToUpload: any[];
  projectFiles: FileItem[];
  deleteDialogOpen: boolean;
  isDeleting: boolean;
  fileToDelete: FileItem | null;
  setFilesToUpload: (files: any[]) => void;
  handleUploadCancel: () => void;
  handleSubmitFiles: () => void;
  setDeleteDialogOpen: (open: boolean) => void;
  confirmDeleteFile: () => void;
}

export default function FileOperationsDialogs({
  isUploadDialogOpen,
  isUploading,
  filesToUpload,
  projectFiles,
  deleteDialogOpen,
  isDeleting,
  fileToDelete,
  setFilesToUpload,
  handleUploadCancel,
  handleSubmitFiles,
  setDeleteDialogOpen,
  confirmDeleteFile,
}: FileOperationsDialogsProps) {
  const t = useTranslations("ProjectDetailPage.fileExplorer");

  return (
    <>
      {/* File Upload Dialog */}
      <Dialog
        open={isUploadDialogOpen}
        onOpenChange={open => {
          if (!isUploading && !open) {
            handleUploadCancel();
          }
        }}
        modal={true}
      >
        <DialogContent className="sm:max-w-md [&>button]:hidden max-w-[90vw] mx-auto">
          <DialogHeader>
            <DialogTitle>{t("uploadDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("uploadDialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <ProjectFileUpload
              files={filesToUpload}
              setFiles={setFilesToUpload}
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="neutral"
              className="cursor-pointer"
              onClick={handleUploadCancel}
              disabled={isUploading}
            >
              {t("cancel")}
            </Button>

            <Button
              onClick={handleSubmitFiles}
              disabled={isUploading || filesToUpload.length === 0}
              className="bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("addingFiles")}
                </>
              ) : (
                t("addFiles")
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={open => {
          if (!isDeleting && !open) {
            setDeleteDialogOpen(false);
          }
        }}
      >
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialogDescription", {
                fileName: fileToDelete?.name || "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row flex-col gap-2 sm:gap-0">
            <div className="flex gap-2">
              <AlertDialogCancel
                disabled={isDeleting}
                className="cursor-pointer mt-0"
              >
                {t("cancel")}
              </AlertDialogCancel>
              <Button
                onClick={confirmDeleteFile}
                disabled={isDeleting}
                className="bg-red-600/80 hover:bg-red-700 text-white cursor-pointer flex items-center justify-center"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin flex self-center" />
                ) : (
                  t("delete")
                )}
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
