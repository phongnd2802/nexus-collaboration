import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Clock, Circle } from "lucide-react";
import { getStatusBadge } from "@/lib/badge-utils";
import { useTranslations } from "next-intl";

interface TaskStatusSelectProps {
  status: string;
  permissionLevel: "none" | "view" | "edit" | "admin";
  handleUpdateStatus: (status: string) => void;
}

export default function TaskStatusSelect({
  status,
  permissionLevel,
  handleUpdateStatus,
}: TaskStatusSelectProps) {
  const t = useTranslations("TaskDetailPage");
  const canEdit = permissionLevel === "admin" || permissionLevel === "edit";

  if (!canEdit) {
    return (
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">{t("status")}</h3>
        <div className="mt-1">{getStatusBadge(status, t)}</div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground">{t("status")}</h3>
      <Select value={status} onValueChange={handleUpdateStatus}>
        <SelectTrigger className="h-9 mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODO">
            <div className="flex items-center">
              <Circle className="h-4 w-4 mr-2 text-gray-400" />
              <span>To Do</span>
            </div>
          </SelectItem>
          <SelectItem value="IN_PROGRESS">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-blue-500" />
              <span>In Progress</span>
            </div>
          </SelectItem>
          <SelectItem value="DONE">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              <span>Done</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
