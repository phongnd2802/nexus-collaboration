"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useAddLinkedTask } from "@/hooks/useAddLinkedTask";
import { useTranslations } from "next-intl";

interface AddLinkedTaskDialogProps {
  taskId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddLinkedTaskDialog({
  taskId,
  projectId,
  isOpen,
  onClose,
  onSuccess,
}: AddLinkedTaskDialogProps) {
  const t = useTranslations("TaskDetailPage");
  const {
    isSubmitting,
    isLoading,
    projectTasks,
    formData,
    setLinkedTaskId,
    setRelationship,
    handleSubmit,
  } = useAddLinkedTask({
    taskId,
    projectId,
    isOpen,
    onSuccess,
    onClose,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("addLinkedTask")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="linkedTaskId">
              {t("taskName")} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.linkedTaskId}
              onValueChange={setLinkedTaskId}
              disabled={isSubmitting || isLoading}
            >
              <SelectTrigger id="linkedTaskId">
                <SelectValue placeholder={t("selectTask")} />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    {t("loadingTasks")}...
                  </div>
                ) : projectTasks.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    {t("noTasksAvailable")}
                  </div>
                ) : (
                  projectTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship">{t("relationship")}</Label>
            <Select
              value={formData.relationship}
              onValueChange={setRelationship}
              disabled={isSubmitting}
            >
              <SelectTrigger id="relationship">
                <SelectValue placeholder={t("selectRelationship")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BLOCKS">{t("blocks")}</SelectItem>
                <SelectItem value="BLOCKED_BY">{t("blockedBy")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="neutral"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("addLink")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
