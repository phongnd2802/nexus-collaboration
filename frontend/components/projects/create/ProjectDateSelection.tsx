import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProjectDateSelectionProps {
  dueDate: string;
  setDueDate: (value: string) => void;
  dueTime: string;
  setDueTime: (value: string) => void;
}

export default function ProjectDateSelection({
  dueDate,
  setDueDate,
  dueTime,
  setDueTime,
}: ProjectDateSelectionProps) {
  const t = useTranslations("ProjectsPage.create");
  return (
    <div className="space-y-2">
      <Label
        htmlFor="due-date"
        className="text-base font-medium flex items-center"
      >
        <Clock className="h-4 w-4 mr-2 text-main" />
        {t("dueDate")}
      </Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          id="due-date"
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="h-11"
          min={new Date().toISOString().split("T")[0]}
        />
        <Input
          id="due-time"
          type="time"
          value={dueTime}
          onChange={e => setDueTime(e.target.value)}
          className="h-11"
          disabled={!dueDate}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t("dueDateDescription")}</p>
    </div>
  );
}
