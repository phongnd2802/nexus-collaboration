import { useTranslations } from "next-intl";
import TaskAttachments from "../TaskAttachments";

interface TaskCompletionViewProps {
  existingNote?: string;
  deliverables?: any[];
}

export default function TaskCompletionView({
  existingNote,
  deliverables,
}: TaskCompletionViewProps) {
  const t = useTranslations("TaskDetailPage");
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <span className="text-green-600"></span> {t("notes")}
        </h4>
        {existingNote ? (
          <p className="whitespace-pre-wrap">{existingNote}</p>
        ) : (
          <p className="text-muted-foreground italic">{t("noNotes")}</p>
        )}
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <span className="text-green-600"></span> {t("deliverables")}
        </h4>
        {deliverables && deliverables.length > 0 ? (
          <TaskAttachments files={deliverables} />
        ) : (
          <p className="text-muted-foreground italic">{t("noDeliverables")}</p>
        )}
      </div>
    </div>
  );
}
