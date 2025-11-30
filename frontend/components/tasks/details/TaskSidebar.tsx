import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import TaskStatusSelect from "./TaskStatusSelect";
import TaskPrioritySelect from "./TaskPrioritySelect";
import TaskAssigneeSelect from "./TaskAssigneeSelect";
import TaskDatePicker from "./TaskDatePicker";
import { Task, User } from "@/types/index";
import { useTranslations } from "next-intl";

interface TaskSidebarProps {
  task: Task;
  isEditing: boolean;
  editedTask: any;
  availableMembers: User[];
  permissionLevel: "none" | "view" | "edit" | "admin";
  handleEditField: (field: string, value: string) => void;
  handleAssigneeChange: (value: string) => void;
  handleUpdateStatus: (status: string) => void;
}

export default function TaskSidebar({
  task,
  isEditing,
  editedTask,
  availableMembers,
  permissionLevel,
  handleEditField,
  handleAssigneeChange,
  handleUpdateStatus,
}: TaskSidebarProps) {
  const t = useTranslations("TaskDetailPage")
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("taskDetails")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <TaskStatusSelect
            status={task.status}
            permissionLevel={permissionLevel}
            handleUpdateStatus={handleUpdateStatus}
          />

          <Separator />

          <TaskPrioritySelect
            priority={task.priority}
            isEditing={isEditing}
            editedTask={editedTask}
            handleEditField={handleEditField}
          />

          <Separator />

          <TaskDatePicker
            dueDate={task.dueDate}
            isEditing={isEditing}
            editedTask={editedTask}
            handleEditField={handleEditField}
          />

          <Separator />

          <TaskAssigneeSelect
            assignee={task.assignee ?? null}
            isEditing={isEditing}
            editedTask={editedTask}
            availableMembers={availableMembers}
            handleAssigneeChange={handleAssigneeChange}
          />

          <Separator />

          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              {t("creator")}
            </h3>
            {task.creator ? (
              <div className="flex items-center mt-1">
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage
                    src={task.creator.image || ""}
                    alt={task.creator.name || "Unknown"}
                  />
                  <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">
                    {getInitials(task.creator.name || "Unknown")}
                  </AvatarFallback>
                </Avatar>
                <span>{task.creator.name || "Unknown"}</span>
              </div>
            ) : (
              <p className="text-muted-foreground mt-1 italic">Unknown</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
