import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PdfPreviewDialog from "../PdfPreviewDialog";
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
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, Project } from "@/types/index";
import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();
  const t = useTranslations("TaskDetailPage");
  const locale = useLocale();
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
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
                onChange={e => handleEditField("title", e.target.value)}
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
            <span>
              {t("created_by")} {task.creator?.name || "Unknown"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4 md:mt-0">
        {(permissionLevel === "admin" ||
          task.assignee?.id === session?.user?.id) && (
          <>
            <Button
              variant="neutral"
              size="sm"
              className="flex items-center"
              onClick={async () => {
                try {
                  const response = await fetch(
                    `${
                      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
                    }/api/export/tasks/${task.id}/pdf?lang=${locale}`,
                    {
                      method: "GET",
                      headers: {
                        "x-user-id": session?.user?.id || "",
                      },
                    }
                  );

                  if (!response.ok) {
                    console.error("Export failed status:", response.status);
                    throw new Error("Export failed");
                  }

                  const blob = await response.blob();
                  setPdfBlob(blob);
                  const url = window.URL.createObjectURL(blob);
                  setPdfUrl(url);
                  setPdfPreviewOpen(true);
                } catch (error) {
                  console.error("Failed to export PDF", error);
                  // You might want to add a toast notification here
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              {t("export_pdf")}
            </Button>

            <PdfPreviewDialog
              open={pdfPreviewOpen}
              onOpenChange={(open) => {
                setPdfPreviewOpen(open);
                if (!open && pdfUrl) {
                  window.URL.revokeObjectURL(pdfUrl);
                  setPdfUrl(null);
                  setPdfBlob(null);
                }
              }}
              pdfUrl={pdfUrl}
              fileName={`${task.title}_${project.name}.pdf`}
              onDownload={() => {
                if (pdfBlob) {
                  const url = window.URL.createObjectURL(pdfBlob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${task.title}_${project.name}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                }
              }}
            />
          </>
        )}

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
            <Button variant="neutral" size="sm" onClick={handleCancelEdit}>
              <X className="h-4 w-4 mr-2" />
              {t("cancel")}
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="!bg-blue-500 hover:!bg-blue-600"
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
