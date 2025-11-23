"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { Deadline } from "@/types/index";
import { DeadlineFilters } from "./deadline-filters";
import { DeadlineEmptyState } from "./deadline-empty-state";
import { DeadlineGroup } from "./deadline-group";
import { useDeadlines } from "@/hooks/use-deadlines";

interface DeadlinesListProps {
  deadlines: Deadline[];
  onTimeFrameChange?: (timeframe: string) => void;
}

/**
 * Main component for displaying a list of deadlines grouped by date.
 * Supports filtering by type (all/project/task) and timeframe selection.
 * Responsive design with collapsible sections on mobile.
 */
export default function DeadlinesList({
  deadlines = [],
  onTimeFrameChange,
}: DeadlinesListProps) {
  const isMobile = useIsMobile();
  const {
    filter,
    setFilter,
    timeframe,
    setTimeframe,
    filteredDeadlines,
    groupedDeadlines,
    openSections,
    toggleSection,
  } = useDeadlines({ deadlines });

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
    onTimeFrameChange?.(value);
  };

  return (
    <Card>
      <CardHeader className={isMobile ? "pb-2 px-3 pt-3" : "pb-2"}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <CardTitle>Upcoming Deadlines</CardTitle>
          <DeadlineFilters
            filter={filter}
            timeframe={timeframe}
            isMobile={isMobile}
            onFilterChange={setFilter}
            onTimeframeChange={handleTimeframeChange}
          />
        </div>
      </CardHeader>

      <CardContent className={isMobile ? "pt-2 px-3 pb-3" : "pt-4"}>
        {filteredDeadlines.length === 0 ? (
          <DeadlineEmptyState filter={filter} />
        ) : (
          <div className="space-y-4">
            {Object.keys(groupedDeadlines).map((dateStr) => (
              <DeadlineGroup
                key={dateStr}
                dateStr={dateStr}
                deadlines={groupedDeadlines[dateStr]}
                isMobile={isMobile}
                isOpen={openSections[dateStr]}
                onToggle={() => toggleSection(dateStr)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
