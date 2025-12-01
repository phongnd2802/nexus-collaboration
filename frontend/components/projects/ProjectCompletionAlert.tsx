import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface ProjectCompletionAlertProps {
  onOpenDialog: () => void;
}

export default function ProjectCompletionAlert({
  onOpenDialog,
}: ProjectCompletionAlertProps) {
  const t = useTranslations("ProjectDetailPage")
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg mb-4 flex items-start">
      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-amber-800 dark:text-amber-300 font-medium">
         {t("all_tasks_completed")}
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {t("project_ready_to_be_marked_as_completed")}
        </p>
      </div>
      <div className="ml-4">
        <Button
          variant="neutral"
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
          onClick={onOpenDialog}
        >
          {t("mark_as_completed")}
        </Button>
      </div>
    </div>
  );
}
