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
          <DialogTitle>Add Linked Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="linkedTaskId">
              Task Name <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.linkedTaskId}
              onValueChange={setLinkedTaskId}
              disabled={isSubmitting || isLoading}
            >
              <SelectTrigger id="linkedTaskId">
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    Loading tasks...
                  </div>
                ) : projectTasks.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    No tasks available
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
            <Label htmlFor="relationship">Relationship Type</Label>
            <Select
              value={formData.relationship}
              onValueChange={setRelationship}
              disabled={isSubmitting}
            >
              <SelectTrigger id="relationship">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BLOCKS">Blocks</SelectItem>
                <SelectItem value="BLOCKED_BY">Blocked by</SelectItem>
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
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
