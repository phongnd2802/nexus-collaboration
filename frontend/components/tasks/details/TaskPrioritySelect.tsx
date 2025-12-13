import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPriorityBadge } from "@/lib/badge-utils";
import { useTranslations } from "next-intl";

interface TaskPrioritySelectProps {
  priority: string;
  isEditing: boolean;
  editedTask: any;
  handleEditField: (field: string, value: string) => void;
}

export default function TaskPrioritySelect({
  priority,
  isEditing,
  editedTask,
  handleEditField,
}: TaskPrioritySelectProps) {
  const t = useTranslations("TaskDetailPage");

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground">{t("priority")}</h3>
      {isEditing ? (
        <Select
          value={editedTask.priority}
          onValueChange={(value) => handleEditField("priority", value)}
        >
          <SelectTrigger className="h-9 mt-1">
            <SelectValue placeholder={t("selectPriority")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                <span>{t("LOW")}</span>
              </div>
            </SelectItem>
            <SelectItem value="MEDIUM">
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                <span>{t("MEDIUM")}</span>
              </div>
            </SelectItem>
            <SelectItem value="HIGH">
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                <span>{t("HIGH")}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="mt-1">{getPriorityBadge(priority, t)}</div>
      )}
    </div>
  );
}
