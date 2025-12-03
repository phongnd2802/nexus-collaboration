import { Flag } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

interface TaskFormPriorityProps {
  priority: string;
  handleSelectChange: (name: string, value: string) => void;
}

export function TaskFormPriority({
  priority,
  handleSelectChange,
}: TaskFormPriorityProps) {
  const t = useTranslations("TasksPage.form");
  return (
    <div className="space-y-2">
      <Label
        htmlFor="priority"
        className="text-base font-medium flex items-center"
      >
        <Flag className="h-4 w-4 mr-2 text-main" />
        {t("priority")}
      </Label>
      <Select
        value={priority}
        onValueChange={value => handleSelectChange("priority", value)}
      >
        <SelectTrigger id="priority" className="h-11 bg-white">
          <SelectValue placeholder="Select priority" />
        </SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="LOW">
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              <span>{t("low")}</span>
            </div>
          </SelectItem>
          <SelectItem value="MEDIUM">
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
              <span>{t("medium")}</span>
            </div>
          </SelectItem>
          <SelectItem value="HIGH">
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-rose-500 mr-2"></span>
              <span>{t("high")}</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
