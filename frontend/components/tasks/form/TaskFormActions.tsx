import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";

interface TaskFormActionsProps {
  mode: "create" | "edit";
  isSubmitting: boolean;
  isValid: boolean;
  onCancel: () => void;
}

export function TaskFormActions({
  mode,
  isSubmitting,
  isValid,
  onCancel,
}: TaskFormActionsProps) {
  const t = useTranslations("TasksPage.form");
  return (
    <div className="pt-2">
      <Separator className="mb-4" />
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
        <Button
          type="button"
          variant="neutral"
          onClick={onCancel}
          className="order-2 sm:order-1"
        >
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !isValid}
          variant="default"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === "create" ? t("creating_task") : t("saving_changes")}
            </>
          ) : (
            <>
              {mode === "create" ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t("create_task")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("save_changes")}
                </>
              )}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
