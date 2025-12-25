import { memo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
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

interface LinkedTask {
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
  relationship: "BLOCKED_BY" | "BLOCKS";
  linkedTaskId?: string;
}

interface Member {
  id: string;
  name: string | null;
  email?: string;
  image?: string | null;
}

interface LinkedTaskItemProps {
  linkedTask: LinkedTask;
  projectMembers: Member[];
  canEdit: boolean;
  onUpdate: (linkedTaskId: string, field: string, value: string) => void;
  onDelete: (linkedTaskId: string) => void;
  taskStatus?: "TODO" | "IN_PROGRESS" | "DONE";
}

const LinkedTaskItem = memo(function LinkedTaskItem({
  linkedTask,
  projectMembers,
  canEdit,
  onUpdate,
  onDelete,
  taskStatus,
}: LinkedTaskItemProps) {
  const t = useTranslations("DashboardPage.taskCard");
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
    <div className="grid grid-cols-[minmax(100px,110px)_minmax(70px,90px)_minmax(100px,150px)_minmax(80px,90px)_minmax(80px,100px)_auto] gap-3 items-center py-2 hover:bg-muted/50 rounded-md transition-colors text-left">
      {/* Name */}
      <div className="min-w-0">
        <Link
          href={`/tasks/${linkedTask.linkedTaskId || linkedTask.id}`}
          className="text-xs font-medium hover:text-primary hover:underline transition-colors block wrap-break-word leading-5"
          title={linkedTask.name}
        >
          {linkedTask.name}
        </Link>
      </div>

      {/* Priority */}
      <div className="flex items-center justify-start">
        <Select
          value={linkedTask.priority}
          onValueChange={(value) =>
            canEdit && onUpdate(linkedTask.id, "priority", value)
          }
          disabled={!canEdit}
        >
          <SelectTrigger className="h-auto border-0 p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 w-fit [&>svg]:hidden shadow-none">
            <SelectValue>
              {getPriorityBadge(linkedTask.priority, t)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">{getPriorityBadge("LOW", t)}</SelectItem>
            <SelectItem value="MEDIUM">
              {getPriorityBadge("MEDIUM", t)}
            </SelectItem>
            <SelectItem value="HIGH">{getPriorityBadge("HIGH", t)}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assignee */}
      <div className="min-w-0 flex items-center justify-start">
        <Select
          value={linkedTask.assigneeId}
          onValueChange={(value) =>
            canEdit && onUpdate(linkedTask.id, "assigneeId", value)
          }
          disabled={!canEdit}
        >
          <SelectTrigger className="h-auto border-0 p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 [&>svg]:hidden shadow-none w-auto max-w-full">
            <SelectValue>
              <div className="flex items-center gap-2 min-w-0 max-w-full">
                <Avatar className="h-5 w-5 shrink-0">
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

      {/* Status */}
      <div className="flex items-center justify-start">
        <Select
          value={linkedTask.status}
          onValueChange={(value) =>
            canEdit && onUpdate(linkedTask.id, "status", value)
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
          onValueChange={(value) =>
            canEdit && onUpdate(linkedTask.id, "relationship", value)
          }
          disabled={!canEdit}
        >
          <SelectTrigger className="h-auto border-0 p-1 hover:bg-transparent focus:ring-0 focus:ring-offset-0 [&>svg]:hidden shadow-none">
            <SelectValue>
              <span className="text-xs">
                {linkedTask.relationship === "BLOCKS" ? "Blocks" : "Blocked By"}
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
        {canEdit && taskStatus !== "DONE" && (
          <Button
            variant="neutral"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(linkedTask.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        {/* Empty space to maintain layout when delete button is hidden */}
        {(!canEdit || taskStatus === "DONE") && <div className="h-8 w-8" />}
      </div>
    </div>
  );
});

export default LinkedTaskItem;
