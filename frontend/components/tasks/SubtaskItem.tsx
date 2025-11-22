import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Check, Pencil, Trash2 } from "lucide-react";
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

interface SubtaskItemProps {
  subtask: Subtask;
  projectMembers: Member[];
  canEdit: boolean;
  editingNameId: string | null;
  editingName: string;
  setEditingName: (name: string) => void;
  onUpdate: (subtaskId: string, field: string, value: string) => void;
  onNameEdit: (subtaskId: string, currentName: string) => void;
  onNameSave: (subtaskId: string) => void;
  onDelete: (subtaskId: string) => void;
  setEditingNameId: (id: string | null) => void;
}

const SubtaskItem = memo(function SubtaskItem({
  subtask,
  projectMembers,
  canEdit,
  editingNameId,
  editingName,
  setEditingName,
  onUpdate,
  onNameEdit,
  onNameSave,
  onDelete,
  setEditingNameId,
}: SubtaskItemProps) {
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
    <div className="grid grid-cols-[minmax(150px,250px)_minmax(90px,100px)_minmax(140px,180px)_minmax(90px,100px)_auto] gap-3 items-center py-2 hover:bg-muted/50 rounded-md transition-colors text-left">
      {/* Name - Editable on click */}
      <div className="flex items-center gap-2 min-w-0">
        {editingNameId === subtask.id ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onNameSave(subtask.id);
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
              className="h-7 w-7 p-0 shrink-0"
              onClick={() => onNameSave(subtask.id)}
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 cursor-pointer hover:text-primary flex-1 min-w-0 group"
            onClick={() => canEdit && onNameEdit(subtask.id, subtask.name)}
            title={subtask.name}
          >
            <span className="text-xs font-medium wrap-break-word leading-5">
              {subtask.name}
            </span>
            {canEdit && (
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 shrink-0 transition-opacity" />
            )}
          </div>
        )}
      </div>

      {/* Priority - Select with custom style */}
      <div className="flex justify-start">
        <Select
          value={subtask.priority}
          onValueChange={(value) =>
            canEdit && onUpdate(subtask.id, "priority", value)
          }
          disabled={!canEdit}
        >
          <SelectTrigger className="h-auto border-0 p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 w-fit [&>svg]:hidden shadow-none">
            <SelectValue>{getPriorityBadge(subtask.priority)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">{getPriorityBadge("LOW")}</SelectItem>
            <SelectItem value="MEDIUM">{getPriorityBadge("MEDIUM")}</SelectItem>
            <SelectItem value="HIGH">{getPriorityBadge("HIGH")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assignee - Select with custom style */}
      <div className="min-w-0 flex justify-start">
        <Select
          value={subtask.assigneeId}
          onValueChange={(value) =>
            canEdit && onUpdate(subtask.id, "assigneeId", value)
          }
          disabled={!canEdit}
        >
          <SelectTrigger className="h-auto border-0 p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 [&>svg]:hidden shadow-none w-auto max-w-full">
            <SelectValue>
              <div className="flex items-center gap-2 min-w-0 max-w-full">
                <Avatar className="h-5 w-5 ring-0 shadow-none shrink-0">
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
            canEdit && onUpdate(subtask.id, "status", value)
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
            onClick={() => onDelete(subtask.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
});

export default SubtaskItem;
