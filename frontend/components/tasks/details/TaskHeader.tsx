import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  CheckCircle,
  Clock,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, Project } from "@/types/index";
import { useTranslations } from "next-intl";

interface TaskHeaderProps {
  task: Task;
  project: Project;
  isEditing: boolean;
  editedTask: any;
  validationErrors: Record<string, string>;
  permissionLevel: "none" | "view" | "edit" | "admin";
  isSaving: boolean;
  isDeleting: boolean;
  handleEditField: (field: string, value: string) => void;
  setIsEditing: (value: boolean) => void;
  handleDeleteTask: () => void;
  handleCancelEdit: () => void;
  handleSaveChanges: () => void;
}

export default function TaskHeader({
  task,
  project,
  isEditing,
  editedTask,
  validationErrors,
  permissionLevel,
  isSaving,
  isDeleting,
  handleEditField,
  setIsEditing,
  handleDeleteTask,
  handleCancelEdit,
  handleSaveChanges,
}: TaskHeaderProps) {
  const t = useTranslations("TaskDetailPage");
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DONE":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "IN_PROGRESS":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "TODO":
        return <Circle className="h-5 w-5 text-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
      <div className="flex gap-4">
        {task.status === "DONE" && (
          <div className="pt-1.5">{getStatusIcon(task.status)}</div>
        )}
        <div>
          {isEditing ? (
            <div className="w-full max-w-md">
              <Input
                value={editedTask.title}
                onChange={(e) => handleEditField("title", e.target.value)}
                className={cn(
                  "text-xl font-bold border-main focus-visible:ring-main",
                  validationErrors.title && "border-red-500"
                )}
              />
              {validationErrors.title && (
                <p className="text-red-500 text-sm mt-1">
                  {validationErrors.title}
                </p>
              )}
            </div>
          ) : (
            <h1 className="text-2xl font-bold">{task.title}</h1>
          )}
          <div className="flex items-center gap-2 text-sm opacity-80">
            <Link
              href={`/projects/${project?.id}`}
              className="hover:text-main  dark:hover:text-main hover:underline"
            >
              {project.name}
            </Link>
            <span>•</span>
            <span>{t("created_by")} {task.creator?.name || "Unknown"}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4 md:mt-0">
        {permissionLevel === "admin" && !isEditing && (
          <>
            <Button
              variant="neutral"
              size="sm"
              className="flex items-center"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              {t("edit")}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="neutral"
                  size="sm"
                  className="flex items-center bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("are_you_sure")}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("are_you_sure_delete_task")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteTask}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("deleting")}...
                      </>
                    ) : (
                      t("delete")
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {isEditing && (
          <>
            <Button
              variant="neutral"
              size="sm"
              onClick={handleCancelEdit}
            >
              <X className="h-4 w-4 mr-2" />
              {t("cancel")}
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleSaveChanges}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("saving")}...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t("save_changes")}
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
