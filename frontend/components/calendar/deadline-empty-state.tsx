import { CalendarDays } from "lucide-react";

interface DeadlineEmptyStateProps {
  filter: string;
}

/**
 * Displays an empty state message when no deadlines are available.
 */
export function DeadlineEmptyState({ filter }: DeadlineEmptyStateProps) {
  const getMessage = () => {
    if (filter === "all") {
      return "You don't have any upcoming deadlines within the selected timeframe.";
    }
    if (filter === "project") {
      return "No project deadlines within the selected timeframe.";
    }
    return "No task deadlines within the selected timeframe.";
  };

  return (
    <div className="text-center py-8">
      <CalendarDays className="h-12 w-12 text-muted-foreground opacity-50 mx-auto mb-3" />
      <h3 className="text-lg font-medium mb-2">No deadlines</h3>
      <p className="text-muted-foreground">{getMessage()}</p>
    </div>
  );
}
