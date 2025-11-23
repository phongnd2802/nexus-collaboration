import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TaskFormData } from "@/hooks/useTaskForm";

interface TaskFormDatesProps {
  formData: TaskFormData;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function TaskFormDates({
  formData,
  handleInputChange,
}: TaskFormDatesProps) {
  return (
    <div className="space-y-2 md:col-span-2">
      <Label
        htmlFor="dueDate"
        className="text-base font-medium flex items-center"
      >
        <Clock className="h-4 w-4 mr-2 text-violet-600" />
        Due Date & Time (Optional)
      </Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={handleInputChange}
            className="h-11"
            min={new Date().toISOString().split("T")[0]}
          />
        </div>
        <div className="relative">
          <Input
            id="dueTime"
            name="dueTime"
            type="time"
            value={formData.dueTime}
            onChange={handleInputChange}
            className="h-11"
            disabled={!formData.dueDate}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Select a date, then optionally set a specific time.
      </p>
    </div>
  );
}
