import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Flag } from "lucide-react";
import { TaskFormData, TaskFormProject } from "@/hooks/useTaskForm";
import { useTranslations } from "next-intl";

interface TaskPreviewProps {
  formData: TaskFormData;
  projects: TaskFormProject[];
  availableMembers: any[];
}

export function TaskPreview({
  formData,
  projects,
  availableMembers,
}: TaskPreviewProps) {
  const t = useTranslations("TasksPage.form");
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "MEDIUM":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      case "HIGH":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <div className="text-lg pb-3">{t("preview")}</div>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1.5">
                {t("preview_title")}
              </h3>
              <p className="font-medium">
                {formData.title || t("preview_title_placeholder")}
              </p>
            </div>

            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1.5">
                {t("preview_project")}
              </h3>
              <p>
                {formData.projectId
                  ? projects.find((p) => p.id === formData.projectId)?.name
                  : t("no_project_selected")}
              </p>
            </div>

            {formData.assigneeId && (
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1.5">
                  {t("assigned_to")}
                </h3>
                <div className="flex items-center">
                  <Avatar className="h-6 w-6 mr-2">
                    {availableMembers.find((m) => m.id === formData.assigneeId)
                      ?.image ? (
                      <AvatarImage
                        src={
                          availableMembers.find(
                            (m) => m.id === formData.assigneeId
                          )?.image || "/placeholder.svg"
                        }
                        alt={
                          availableMembers.find(
                            (m) => m.id === formData.assigneeId
                          )?.name || "User"
                        }
                      />
                    ) : (
                      <AvatarFallback>
                        {availableMembers.find(
                          (m) => m.id === formData.assigneeId
                        )?.name
                          ? availableMembers
                              .find((m) => m.id === formData.assigneeId)
                              ?.name.charAt(0)
                              .toUpperCase()
                          : "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span>
                    {availableMembers.find((m) => m.id === formData.assigneeId)
                      ?.name || "Unnamed User"}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {formData.priority && (
                <Badge
                  variant="default"
                  className={`${getPriorityColor(formData.priority)}`}
                >
                  <Flag className="h-3 w-3 mr-1" />
                  {formData.priority.charAt(0) +
                    formData.priority.slice(1).toLowerCase()}{" "}
                  Priority
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
