import { Button } from "@/components/ui/button";
import { CheckCircle2, Edit, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface TaskCompletionHeaderProps {
  canEdit: boolean;
  isEditing: boolean;
  hasExistingData: boolean;
  onEnterEditMode: () => void;
  onCancelEdit: () => void;
}

export default function TaskCompletionHeader({
  canEdit,
  isEditing,
  hasExistingData,
  onEnterEditMode,
  onCancelEdit,
}: TaskCompletionHeaderProps) {
  const t = useTranslations("TaskDetailPage");
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
        <h3 className="font-medium">{t("taskCompletion")}</h3>
      </div>

      {canEdit && !isEditing && (
        <Button
          variant="neutral"
          size="sm"
          onClick={onEnterEditMode}
          className="flex items-center gap-1 cursor-pointer"
        >
          <Edit className="h-4 w-4" />
        </Button>
      )}

      {isEditing && hasExistingData && (
        <Button
          variant="default"
          size="sm"
          onClick={onCancelEdit}
          className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
        >
          <X className="h-4 w-4" />
          <span>{t("cancel")}</span>
        </Button>
      )}
    </div>
  );
}
