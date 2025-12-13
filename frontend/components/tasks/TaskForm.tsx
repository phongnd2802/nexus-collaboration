"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Paperclip, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import TaskFileUpload from "@/components/tasks/TaskFileUpload";
import {
  useTaskForm,
  TaskFormProject,
  TaskFormTask,
} from "@/hooks/useTaskForm";
import { TaskFormFields } from "./form/TaskFormFields";
import { TaskFormProjectSelect } from "./form/TaskFormProjectSelect";
import { TaskFormAssigneeSelect } from "./form/TaskFormAssigneeSelect";
import { TaskFormStatusSelect } from "./form/TaskFormStatusSelect";
import { TaskFormDates } from "./form/TaskFormDates";
import { TaskFormPriority } from "./form/TaskFormPriority";
import { TaskFormActions } from "./form/TaskFormActions";
import { TaskPreview } from "./form/TaskPreview";
import { useTranslations } from "next-intl";

interface TaskFormProps {
  mode: "create" | "edit";
  taskId?: string;
  initialTask?: TaskFormTask;
  initialProjectId?: string;
  projects: TaskFormProject[];
  isLoading: boolean;
  onCancel?: () => void;
  onSuccess?: (taskId: string, projectId: string) => void;
}

export default function TaskForm({
  mode = "create",
  taskId,
  initialTask,
  initialProjectId,
  projects,
  isLoading,
  onCancel,
  onSuccess,
}: TaskFormProps) {
  const t = useTranslations("TasksPage.form");
  const router = useRouter();

  const {
    formData,
    errors,
    formError,
    isSubmitting,
    availableMembers,
    attachedFiles,
    setAttachedFiles,
    handleInputChange,
    handleSelectChange,
    handleSubmit,
  } = useTaskForm({
    mode,
    taskId,
    initialTask,
    initialProjectId,
    projects,
    onSuccess,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-main" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardContent>
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-red-600 dark:text-red-400 text-sm mb-6 flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <TaskFormFields
              formData={formData}
              errors={errors}
              handleInputChange={handleInputChange}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TaskFormProjectSelect
                projectId={formData.projectId}
                projects={projects}
                errors={errors}
                handleSelectChange={handleSelectChange}
                mode={mode}
              />

              <TaskFormAssigneeSelect
                assigneeId={formData.assigneeId}
                projectId={formData.projectId}
                availableMembers={availableMembers}
                handleSelectChange={handleSelectChange}
              />

              <TaskFormStatusSelect
                status={formData.status}
                handleSelectChange={handleSelectChange}
                mode={mode}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TaskFormDates
                formData={formData}
                handleInputChange={handleInputChange}
              />

              <TaskFormPriority
                priority={formData.priority}
                handleSelectChange={handleSelectChange}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="attachments"
                className="text-base font-medium flex items-center"
              >
                <Paperclip className="h-4 w-4 mr-2 text-main" />
                {t("attachments")}
              </Label>
              <TaskFileUpload
                files={attachedFiles}
                setFiles={setAttachedFiles}
              />
            </div>

            <TaskFormActions
              mode={mode}
              isSubmitting={isSubmitting}
              isValid={!!formData.projectId}
              onCancel={onCancel || (() => router.back())}
            />
          </form>
        </CardContent>
      </Card>

      <TaskPreview
        formData={formData}
        projects={projects}
        availableMembers={availableMembers}
      />
    </div>
  );
}
