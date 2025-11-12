"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import AddLinkedTaskDialog from "./AddLinkedTaskDialog";
import Link from "next/link";

interface LinkedTask {
  id: string; // This is the link ID
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
  relationship: "BLOCKED_BY" | "BLOCKS";
  linkedTaskId?: string; // The actual task ID
}

interface Member {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface LinkedTaskSectionProps {
  taskId: string;
  projectId: string;
  linkedTasks: LinkedTask[];
  projectMembers: Member[];
  onLinkedTaskAdded: () => void;
  onLinkedTaskUpdated: () => void;
  canEdit: boolean;
}

export default function LinkedTaskSection({
  taskId,
  projectId,
  linkedTasks,
  projectMembers,
  onLinkedTaskAdded,
  onLinkedTaskUpdated,
  canEdit,
}: LinkedTaskSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: session } = useSession();

  const handleUpdateLinkedTask = async (
    linkedTaskId: string,
    field: string,
    value: string
  ) => {
    try {
      // If updating relationship, use task link endpoint
      if (field === "relationship") {
        const response = await fetch(
          `/api/tasks/${taskId}/links/${linkedTaskId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ relationship: value }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update linked task relationship");
        }
      } else {
        // For other fields (priority, assignee, status), update the actual task
        // We need to get the actual task ID from linkedTask object
        const linkedTask = linkedTasks.find(lt => lt.id === linkedTaskId);
        if (!linkedTask) return;

        const response = await fetch(
          `/api/tasks/update/${linkedTask.linkedTaskId || linkedTask.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              [field]: value,
              userId: session?.user?.id,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update linked task");
        }
      }

      toast.success("Linked task updated successfully");
      onLinkedTaskUpdated();
    } catch (error: any) {
      console.error("Error updating linked task:", error);
      toast.error(error.message || "Failed to update linked task");
    }
  };

  const handleDeleteLinkedTask = async (linkedTaskId: string) => {
    if (!confirm("Are you sure you want to remove this linked task?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/tasks/${taskId}/links/${linkedTaskId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete linked task");
      }

      toast.success("Linked task removed successfully");
      onLinkedTaskUpdated();
    } catch (error) {
      console.error("Error deleting linked task:", error);
      toast.error("Failed to remove linked task");
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Linked task</CardTitle>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add link
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {linkedTasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No linked tasks yet
          </p>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[minmax(140px,220px)_minmax(70px,100px)_minmax(100px,130px)_minmax(60px,100px)_minmax(120px,120px)_auto] gap-3 text-xs font-medium text-muted-foreground pb-2 border-b text-left">
              <div>Name</div>
              <div>Priority</div>
              <div>Assignee</div>
              <div>Status</div>
              <div>Relationship</div>
              <div></div>
            </div>

            {/* Rows */}
            {linkedTasks.map(linkedTask => (
              <div
                key={linkedTask.id}
                className="grid grid-cols-[minmax(130px,200px)_minmax(60px,70px)_minmax(100px,150px)_minmax(80px,90px)_minmax(80px,100px)_auto] gap-3 items-center py-2 hover:bg-muted/50 rounded-md transition-colors text-left"
              >
                {/* Name */}
                <div className="min-w-0">
                  <Link
                    href={`/tasks/${linkedTask.linkedTaskId || linkedTask.id}`}
                    className="text-xs font-medium hover:text-primary hover:underline transition-colors block break-words leading-5"
                    title={linkedTask.name}
                  >
                    {linkedTask.name}
                  </Link>
                </div>

                {/* Priority */}
                <div className="flex items-center justify-start">
                  <Select
                    value={linkedTask.priority}
                    onValueChange={value =>
                      canEdit &&
                      handleUpdateLinkedTask(linkedTask.id, "priority", value)
                    }
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="h-auto border-0 p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 w-fit [&>svg]:hidden shadow-none">
                      <SelectValue>
                        {getPriorityBadge(linkedTask.priority)}
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

                {/* Assignee */}
                <div className="min-w-0 flex items-center justify-start">
                  <Select
                    value={linkedTask.assigneeId}
                    onValueChange={value =>
                      canEdit &&
                      handleUpdateLinkedTask(linkedTask.id, "assigneeId", value)
                    }
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="h-auto border-0 p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 [&>svg]:hidden shadow-none w-auto max-w-full">
                      <SelectValue>
                        <div className="flex items-center gap-2 min-w-0 max-w-full">
                          <Avatar className="h-5 w-5 flex-shrink-0">
                            <AvatarImage src={linkedTask.assignee.image} />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(linkedTask.assignee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs truncate max-w-[110px]">
                            {linkedTask.assignee.name || "Unassigned"}
                          </span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {projectMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={member.image} />
                              <AvatarFallback className="text-xs">
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="flex items-center justify-start">
                  <Select
                    value={linkedTask.status}
                    onValueChange={value =>
                      canEdit &&
                      handleUpdateLinkedTask(linkedTask.id, "status", value)
                    }
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="h-auto border-0 p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 w-fit [&>svg]:hidden shadow-none">
                      <SelectValue>
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-medium ${getStatusBgColor(
                            linkedTask.status
                          )}`}
                        >
                          {getStatusLabel(linkedTask.status)}
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

                {/* Relationship */}
                <div className="flex items-center justify-start">
                  <Select
                    value={linkedTask.relationship}
                    onValueChange={value =>
                      canEdit &&
                      handleUpdateLinkedTask(
                        linkedTask.id,
                        "relationship",
                        value
                      )
                    }
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="h-auto border-0 p-1 hover:bg-transparent focus:ring-0 focus:ring-offset-0 [&>svg]:hidden shadow-none">
                      <SelectValue>
                        <span className="text-xs">
                          {linkedTask.relationship === "BLOCKS"
                            ? "Blocks"
                            : "Blocked By"}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BLOCKS">Blocks</SelectItem>
                      <SelectItem value="BLOCKED_BY">Blocked By</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center">
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteLinkedTask(linkedTask.id)}
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

      <AddLinkedTaskDialog
        taskId={taskId}
        projectId={projectId}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={onLinkedTaskAdded}
      />
    </Card>
  );
}
