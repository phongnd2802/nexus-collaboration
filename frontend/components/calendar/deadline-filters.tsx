import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

interface DeadlineFiltersProps {
  filter: string;
  timeframe: string;
  isMobile: boolean;
  onFilterChange: (value: string) => void;
  onTimeframeChange: (value: string) => void;
}

/**
 * Filter controls for deadlines list (type filter and timeframe selector).
 */
export function DeadlineFilters({
  filter,
  timeframe,
  isMobile,
  onFilterChange,
  onTimeframeChange,
}: DeadlineFiltersProps) {
  const t = useTranslations("CalendarPage");
  return (
    <div className={isMobile ? "flex flex-col gap-2" : "flex gap-2"}>
      <Select value={filter} onValueChange={onFilterChange}>
        <SelectTrigger className={isMobile ? "w-full" : "w-[120px]"}>
          <SelectValue placeholder={t("filter")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("all")}</SelectItem>
          <SelectItem value="project">{t("project")}</SelectItem>
          <SelectItem value="task">{t("task")}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={timeframe} onValueChange={onTimeframeChange}>
        <SelectTrigger className={isMobile ? "w-full" : "w-[120px]"}>
          <SelectValue placeholder="Timeframe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">7 {t("day")}</SelectItem>
          <SelectItem value="14">14 {t("day")}</SelectItem>
          <SelectItem value="30">30 {t("day")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
