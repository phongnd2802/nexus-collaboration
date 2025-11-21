import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  return (
    <div className={isMobile ? "flex flex-col gap-2" : "flex gap-2"}>
      <Select value={filter} onValueChange={onFilterChange}>
        <SelectTrigger className={isMobile ? "w-full" : "w-[120px]"}>
          <SelectValue placeholder="Filter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="project">Projects</SelectItem>
          <SelectItem value="task">Tasks</SelectItem>
        </SelectContent>
      </Select>

      <Select value={timeframe} onValueChange={onTimeframeChange}>
        <SelectTrigger className={isMobile ? "w-full" : "w-[120px]"}>
          <SelectValue placeholder="Timeframe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">7 days</SelectItem>
          <SelectItem value="14">14 days</SelectItem>
          <SelectItem value="30">30 days</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
