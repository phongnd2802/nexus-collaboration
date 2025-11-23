"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
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

interface Task {
  id: string;
  title: string;
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [formData, setFormData] = useState({
    linkedTaskId: "",
    relationship: "BLOCKS",
  });

  useEffect(() => {
    console.log("Dialog opened:", isOpen, "ProjectId:", projectId);
    if (isOpen && projectId) {
      fetchProjectTasks();
    }
  }, [isOpen, projectId]);

  const fetchProjectTasks = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching tasks for projectId:", projectId);
      const response = await fetch(`/api/tasks/project/${projectId}`);
      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error("Failed to fetch tasks");
      }
      const data = await response.json();
      console.log("Fetched tasks:", data);

      // Filter out current task
      const filteredTasks = data.filter((task: Task) => task.id !== taskId);
      console.log("Filtered tasks (excluding current):", filteredTasks);
      setProjectTasks(filteredTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.linkedTaskId) {
      toast.error("Please select a task to link");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create linked task");
      }

      toast.success("Linked task created successfully");
      setFormData({
        linkedTaskId: "",
        relationship: "BLOCKS",
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error creating linked task:", error);
      toast.error(error.message || "Failed to create linked task");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              onValueChange={value =>
                setFormData({ ...formData, linkedTaskId: value })
              }
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
                  projectTasks.map(task => (
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
              onValueChange={value =>
                setFormData({ ...formData, relationship: value })
              }
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
              variant="outline"
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
