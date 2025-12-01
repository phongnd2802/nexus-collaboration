import { CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";

interface DeadlineEmptyStateProps {
  filter: string;
}

/**
 * Displays an empty state message when no deadlines are available.
 */
export function DeadlineEmptyState({ filter }: DeadlineEmptyStateProps) {
  const t = useTranslations("CalendarPage");
  const getMessage = () => {
    if (filter === "all") {
      return t("noDeadlines");
    }
    if (filter === "project") {
      return t("noProjectDeadlines");
    }
    return t("noTaskDeadlines");
  };

  return (
    <div className="text-center py-8">
      <CalendarDays className="h-12 w-12 text-muted-foreground opacity-50 mx-auto mb-3" />
      <h3 className="text-lg font-medium mb-2">{t("noDeadlinesTitle")}</h3>
      <p className="text-muted-foreground">{getMessage()}</p>
    </div>
  );
}
