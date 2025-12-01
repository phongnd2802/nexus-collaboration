import { ActivityIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function ActivityEmptyState() {
  const t = useTranslations("DashboardPage.activityFeed");
  return (
    <div className="text-center p-8">
      <div className="flex justify-center mb-4">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <ActivityIcon className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
      <p className="text-muted-foreground">{t("emptyState")}</p>
    </div>
  );
}