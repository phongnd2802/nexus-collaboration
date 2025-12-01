import { CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

interface TaskFormStatusSelectProps {
  status: string;
  handleSelectChange: (name: string, value: string) => void;
  mode: "create" | "edit";
}

export function TaskFormStatusSelect({
  status,
  handleSelectChange,
  mode,
}: TaskFormStatusSelectProps) {
  const t = useTranslations("TasksPage.form");
  if (mode !== "edit") return null;

  return (
    <div className="space-y-2">
      <Label
        htmlFor="status"
        className="text-base font-medium flex items-center"
      >
        <CheckCircle2 className="h-4 w-4 mr-2 text-main" />
        {t("status")}
      </Label>
      <Select
        value={status}
        onValueChange={(value) => handleSelectChange("status", value)}
      >
        <SelectTrigger id="status" className="h-11">
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODO">
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
              <span>To Do</span>
            </div>
          </SelectItem>
          <SelectItem value="IN_PROGRESS">
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
              <span>In Progress</span>
            </div>
          </SelectItem>
          <SelectItem value="DONE">
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              <span>Done</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
