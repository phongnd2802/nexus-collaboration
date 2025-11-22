import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TaskFormData } from "@/hooks/useTaskForm";

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
          Task Title*
        </Label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="Enter a clear, specific task title"
          className={cn("h-11", errors.title && "border-destructive")}
          required
        />
        {errors.title ? (
          <p className="text-sm text-destructive">{errors.title}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            A concise title helps team members understand the task at a glance
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
          Description
        </Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Provide details, context, and any specific requirements for this task"
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
              Provide any additional context or requirements
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
