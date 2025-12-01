import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

interface TaskDatePickerProps {
  dueDate: string | null;
  isEditing: boolean;
  editedTask: any;
  handleEditField: (field: string, value: string) => void;
}

export default function TaskDatePicker({
  dueDate,
  isEditing,
  editedTask,
  handleEditField,
}: TaskDatePickerProps) {
  const t = useTranslations("TaskDetailPage");
  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return t("noDueDate");

    const date = new Date(dateString);
    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;

    if (hasTime) {
      return format(date, "MMM d, yyyy 'at' HH:mm");
    }
    return format(date, "MMM d, yyyy");
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground">
        {t("dueDate")}
      </h3>
      {isEditing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          <Input
            type="date"
            value={editedTask.dueDate}
            onChange={(e) => handleEditField("dueDate", e.target.value)}
            className="h-9"
            min={new Date().toISOString().split("T")[0]}
          />
          <Input
            type="time"
            value={editedTask.dueTime || ""}
            onChange={(e) => handleEditField("dueTime", e.target.value)}
            className="h-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-clock-picker-indicator]:hidden"
            disabled={!editedTask.dueDate}
          />
        </div>
      ) : (
        <p className="mt-1">{formatDueDate(dueDate)}</p>
      )}
    </div>
  );
}
