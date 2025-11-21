"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Check, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInitials } from "@/lib/utils";
import { getPriorityBadge } from "@/lib/badge-utils";
import { toast } from "sonner";
import AddSubtaskDialog from "./AddSubtaskDialog";

interface Subtask {
  id: string;
  name: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  assigneeId: string;
  assignee: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  status: "TODO" | "IN_PROGRESS" | "DONE";
}

interface Member {
  id: string;
  name: string | null;
  email?: string;
  image?: string | null;
}

interface SubtaskSectionProps {
  taskId: string;
  subtasks: Subtask[];
  projectMembers: Member[];
  onSubtaskAdded: () => void;
  onSubtaskUpdated: () => void;
  canEdit: boolean;
}

export default function SubtaskSection({
  taskId,
  subtasks,
  projectMembers,
  onSubtaskAdded,
  onSubtaskUpdated,
  canEdit,
}: SubtaskSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleUpdateSubtask = async (
    subtaskId: string,
    field: string,
    value: string
  ) => {
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/subtasks/${subtaskId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ [field]: value }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update subtask");
      }

      toast.success("Subtask updated successfully");
      onSubtaskUpdated();
    } catch (error) {
      console.error("Error updating subtask:", error);
      toast.error("Failed to update subtask");
    }
  };

  const handleNameEdit = (subtaskId: string, currentName: string) => {
    setEditingNameId(subtaskId);
    setEditingName(currentName);
  };

  const handleNameSave = async (subtaskId: string) => {
    if (
      editingName.trim() &&
      editingName !== subtasks.find((s) => s.id === subtaskId)?.name
    ) {
      await handleUpdateSubtask(subtaskId, "name", editingName.trim());
    }
    setEditingNameId(null);
    setEditingName("");
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!confirm("Are you sure you want to delete this subtask?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/subtasks/${subtaskId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete subtask");
      }

      toast.success("Subtask deleted successfully");
      onSubtaskUpdated();
    } catch (error) {
      console.error("Error deleting subtask:", error);
      toast.error("Failed to delete subtask");
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "TODO":
        return "To Do";
      case "IN_PROGRESS":
        return "In Progress";
      case "DONE":
        return "Done";
      default:
        return status;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "DONE":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
      case "IN_PROGRESS":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      case "TODO":
        return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400";
    }
  };

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Subtask</CardTitle>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add subtask
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {subtasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No subtasks yet
          </p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[minmax(170px,270px)_minmax(120px,130px)_minmax(120px,180px)_minmax(130px,150px)_auto] gap-3 text-xs font-medium text-muted-foreground pb-2 border-b text-left">
              <div>Name</div>
              <div>Priority</div>
              <div>Assignee</div>
              <div>Status</div>
              <div></div>
            </div>
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="grid grid-cols-[minmax(150px,250px)_minmax(90px,100px)_minmax(140px,180px)_minmax(90px,100px)_auto] gap-3 items-center py-2 hover:bg-muted/50 rounded-md transition-colors text-left"
              >
                {/* Name - Editable on click */}
                <div className="flex items-center gap-2 min-w-0">
                  {editingNameId === subtask.id ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleNameSave(subtask.id);
                          } else if (e.key === "Escape") {
                            setEditingNameId(null);
                            setEditingName("");
                          }
                        }}
                        className="h-7 text-xs"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 flex-shrink-0"
                        onClick={() => handleNameSave(subtask.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-2 cursor-pointer hover:text-primary flex-1 min-w-0 group"
                      onClick={() =>
                        canEdit && handleNameEdit(subtask.id, subtask.name)
                      }
                      title={subtask.name}
                    >
                      <span className="text-xs font-medium break-words leading-5">
                        {subtask.name}
                      </span>
                      {canEdit && (
                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 flex-shrink-0 transition-opacity" />
                      )}
                    </div>
                  )}
                </div>

                {/* Priority - Select with custom style */}
                <div className="flex justify-start">
                  <Select
                    value={subtask.priority}
                    onValueChange={(value) =>
                      canEdit &&
                      handleUpdateSubtask(subtask.id, "priority", value)
                    }
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="h-auto border-0 p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 w-fit [&>svg]:hidden shadow-none">
                      <SelectValue>
                        {getPriorityBadge(subtask.priority)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">
                        {getPriorityBadge("LOW")}
                      </SelectItem>
                      <SelectItem value="MEDIUM">
                        {getPriorityBadge("MEDIUM")}
                      </SelectItem>
                      <SelectItem value="HIGH">
                        {getPriorityBadge("HIGH")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignee - Select with custom style */}
                <div className="min-w-0 flex justify-start">
                  <Select
                    value={subtask.assigneeId}
                    onValueChange={(value) =>
                      canEdit &&
                      handleUpdateSubtask(subtask.id, "assigneeId", value)
                    }
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="h-auto border-0 p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 [&>svg]:hidden shadow-none w-auto max-w-full">
                      <SelectValue>
                        <div className="flex items-center gap-2 min-w-0 max-w-full">
                          <Avatar className="h-5 w-5 ring-0 shadow-none flex-shrink-0">
                            <AvatarImage src={subtask.assignee.image} />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(subtask.assignee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs truncate max-w-[120px]">
                            {subtask.assignee.name || "Unassigned"}
                          </span>
                        </div>
                      </SelectValue>
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
                            <span>{member.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status - Select with custom style (badge) */}
                <div className="flex justify-start">
                  <Select
                    value={subtask.status}
                    onValueChange={(value) =>
                      canEdit &&
                      handleUpdateSubtask(subtask.id, "status", value)
                    }
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="h-auto border-0 p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 w-fit [&>svg]:hidden shadow-none">
                      <SelectValue>
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-medium ${getStatusBgColor(
                            subtask.status
                          )} shadow-none`}
                        >
                          {getStatusLabel(subtask.status)}
                        </span>
                      </SelectValue>
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="TODO">
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-medium ${getStatusBgColor(
                            "TODO"
                          )}`}
                        >
                          To Do
                        </span>
                      </SelectItem>
                      <SelectItem value="IN_PROGRESS">
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-medium ${getStatusBgColor(
                            "IN_PROGRESS"
                          )}`}
                        >
                          In Progress
                        </span>
                      </SelectItem>
                      <SelectItem value="DONE">
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-medium ${getStatusBgColor(
                            "DONE"
                          )}`}
                        >
                          Done
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions - Delete button */}
                <div className="flex items-center justify-center">
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteSubtask(subtask.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AddSubtaskDialog
        taskId={taskId}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={onSubtaskAdded}
        projectMembers={projectMembers}
      />
    </Card>
  );
}
