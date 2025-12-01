import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import TaskAttachments from "@/components/tasks/TaskAttachments";
import { Task } from "@/types/index";
import { useTranslations } from "next-intl";

interface TaskDescriptionProps {
  task: Task;
  isEditing: boolean;
  editedTask: any;
  validationErrors: Record<string, string>;
  handleEditField: (field: string, value: string) => void;
  taskFiles: any[];
}

export default function   TaskDescription({
  task,
  isEditing,
  editedTask,
  validationErrors,
  handleEditField,
  taskFiles,
}: TaskDescriptionProps) {
  const t = useTranslations("TaskDetailPage");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          {t("description")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedTask.description}
              onChange={(e) => handleEditField("description", e.target.value)}
              placeholder={t("addDescription")}
              rows={5}
              className={cn(
                "resize-y min-h-[120px]",
                validationErrors.description && "border-red-500"
              )}
            />
            {validationErrors.description && (
              <p className="text-red-500 text-sm">
                {validationErrors.description}
              </p>
            )}
            <div className="flex justify-end">
              <p className="text-xs text-muted-foreground">
                {editedTask.description?.length || 0}/2000
              </p>
            </div>
          </div>
        ) : (
          <>
            {task.description ? (
              <div className="prose dark:prose-invert max-w-none">
                <p>{task.description}</p>
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                {t("noDescription")}
              </p>
            )}
          </>
        )}
        {taskFiles.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">{t("attachments")}</h3>
              <TaskAttachments files={taskFiles} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
