"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface Member {
  id: string;
  name: string | null;
  email?: string;
  image?: string | null;
}

interface AddSubtaskDialogProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectMembers: Member[];
}

export default function AddSubtaskDialog({
  taskId,
  isOpen,
  onClose,
  onSuccess,
  projectMembers,
}: AddSubtaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    priority: "MEDIUM",
    assigneeId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter subtask name");
      return;
    }

    if (!formData.assigneeId) {
      toast.error("Please select an assignee");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create subtask");
      }

      toast.success("Subtask created successfully");
      setFormData({
        name: "",
        priority: "MEDIUM",
        assigneeId: "",
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating subtask:", error);
      toast.error("Failed to create subtask");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Subtask</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Subtask Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter subtask name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) =>
                setFormData({ ...formData, priority: value })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Low</span>
                  </div>
                </SelectItem>
                <SelectItem value="MEDIUM">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span>Medium</span>
                  </div>
                </SelectItem>
                <SelectItem value="HIGH">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span>High</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">
              Assignee <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.assigneeId}
              onValueChange={(value) =>
                setFormData({ ...formData, assigneeId: value })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="assignee">
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {projectMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={member.image || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.name || "Unknown")}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.name || "Unknown"}</span>
                    </div>
                  </SelectItem>
                ))}
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
              Create subtask
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
