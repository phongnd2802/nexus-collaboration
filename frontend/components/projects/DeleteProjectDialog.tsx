"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";

interface DeleteProjectDialogProps {
  project: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteProjectDialog({
  project,
  isOpen,
  onOpenChange,
}: DeleteProjectDialogProps) {
  const t = useTranslations("deleteProjectDialog");
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const router = useRouter();

  const handleDeleteProject = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();

    if (confirmText !== project.name) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete project");
      }

      onOpenChange(false);
      setConfirmText("");
      toast.success("Project deleted successfully");

      setTimeout(() => {
        router.push("/projects");
      }, 500);
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete project"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isDeleting) {
      onOpenChange(open);
      if (!open) setConfirmText("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="space-y-4">
            <span>{t("description")}</span>

            <span className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md text-amber-800 dark:text-amber-300 text-sm flex items-start mt-2">
              <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
              <span>
                {t("confirm_text")}{" "}
                <span className="font-bold">{project.name}</span>
              </span>
            </span>

            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={confirmText === project.name ? "border-green-500" : ""}
            />
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 sm:space-x-2">
          <Button
            variant="neutral"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
            className="mt-3 sm:mt-0"
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={(e) => handleDeleteProject(e)}
            disabled={isDeleting || confirmText !== project.name}
            className={`bg-red-600 hover:bg-red-700 text-white ${
              confirmText !== project.name
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("deleting")}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {t("delete")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
