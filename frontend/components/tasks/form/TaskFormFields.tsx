import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TaskFormData } from "@/hooks/useTaskForm";
import { useTranslations } from "next-intl";

interface TaskFormFieldsProps {
  formData: TaskFormData;
  errors: Record<string, string>;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
}

export function TaskFormFields({
  formData,
  errors,
  handleInputChange,
}: TaskFormFieldsProps) {
  const t = useTranslations("TasksPage.form");
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label
          htmlFor="title"
          className={cn(
            "text-base font-medium",
            errors.title && "text-destructive"
          )}
        >
          {t("title")}
        </Label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder={t("title_placeholder")}
          className={cn("h-11", errors.title && "border-destructive")}
          required
        />
        {errors.title ? (
          <p className="text-sm text-destructive">{errors.title}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("title_helper")}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="description"
          className={cn(
            "text-base font-medium",
            errors.description && "text-destructive"
          )}
        >
          {t("description")}
        </Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder={t("description_placeholder")}
          rows={5}
          className={cn(
            "resize-y min-h-[120px]",
            errors.description && "border-destructive"
          )}
        />
        <div className="flex justify-between">
          {errors.description ? (
            <p className="text-sm text-destructive">{errors.description}</p>
          ) : (
            <span className="text-xs text-muted-foreground">
              {t("description_helper")}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {formData.description.length}/2000
          </span>
        </div>
      </div>
    </div>
  );
}
