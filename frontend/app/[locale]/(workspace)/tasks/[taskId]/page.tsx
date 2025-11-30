"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, AlertTriangle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import TaskCompletion from "@/components/tasks/TaskCompletion";
import SubtaskSection from "@/components/tasks/SubtaskSection";
import LinkedTaskSection from "@/components/tasks/LinkedTaskSection";
import { useTaskDetails } from "@/hooks/useTaskDetails";
import TaskHeader from "@/components/tasks/details/TaskHeader";
import TaskDescription from "@/components/tasks/details/TaskDescription";
import TaskSidebar from "@/components/tasks/details/TaskSidebar";
import { useTranslations } from "next-intl";

export default function TaskDetailsPage() {
  const t = useTranslations("TaskDetailPage");
  const params = useParams();
  const taskId = params?.taskId as string;
  const { status } = useSession();
  const router = useRouter();

  const {
    isLoading,
    project,
    task,
    isEditing,
    setIsEditing,
    isSaving,
    isDeleting,
    error,
    availableMembers,
    permissionLevel,
    taskFiles,
    taskDeliverables,
    isAssignee,
    subtasks,
    linkedTasks,
    editedTask,
    validationErrors,
    fetchProjectAndTaskDetails,
    handleUpdateStatus,
    handleEditField,
    handleSaveChanges,
    handleCancelEdit,
    handleAssigneeChange,
    handleDeleteTask,
    handleCompletionNoteUpdate,
  } = useTaskDetails(taskId);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-main" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push(`/auth/signin?callbackUrl=/task/${taskId}`);
    return null;
  }

  if (error || !project || !task || permissionLevel === "none") {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              {!project
                ? t("projectNotFound")
                : !task
                ? t("taskNotFound")
                : t("permissionDenied")}
            </CardTitle>
            <CardDescription>
              {!project
                ? t("projectNotFoundDescription")
                : !task
                ? t("taskNotFoundDescription")
                : t("permissionDeniedDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-destructive/10 p-4 rounded-md text-destructive flex items-start">
              <Ban className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{t("accessRestricted")}</p>
                <p className="text-sm mt-1">
                  {error || t("youNeedToBeAMemberOfThisProjectToViewTasks")}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button asChild>
                <Link href={`/projects/${project?.id}`}>{t("returnToProject")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <TaskHeader
        task={task}
        project={project}
        isEditing={isEditing}
        editedTask={editedTask}
        validationErrors={validationErrors}
        permissionLevel={permissionLevel}
        isSaving={isSaving}
        isDeleting={isDeleting}
        handleEditField={handleEditField}
        setIsEditing={setIsEditing}
        handleDeleteTask={handleDeleteTask}
        handleCancelEdit={handleCancelEdit}
        handleSaveChanges={handleSaveChanges}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TaskDescription
            task={task}
            isEditing={isEditing}
            editedTask={editedTask}
            validationErrors={validationErrors}
            handleEditField={handleEditField}
            taskFiles={taskFiles}
          />

          {task.status === "DONE" &&
            (task.completionNote ||
              taskDeliverables.length > 0 ||
              isAssignee ||
              permissionLevel === "admin") && (
              <Card>
                <CardContent>
                  <TaskCompletion
                    taskId={taskId}
                    isAssignee={isAssignee}
                    isAdmin={permissionLevel === "admin"}
                    existingNote={task.completionNote ?? undefined}
                    onNoteUpdated={handleCompletionNoteUpdate}
                    deliverables={taskDeliverables}
                  />
                </CardContent>
              </Card>
            )}

          {/* Subtask Section */}
          <SubtaskSection
            taskId={taskId}
            subtasks={subtasks}
            projectMembers={availableMembers}
            onSubtaskAdded={() => fetchProjectAndTaskDetails()}
            onSubtaskUpdated={() => fetchProjectAndTaskDetails()}
            canEdit={permissionLevel === "admin" || permissionLevel === "edit"}
            taskStatus={task?.status}
          />

          {/* Linked Task Section */}
          <LinkedTaskSection
            taskId={taskId}
            projectId={task?.project?.id || ""}
            linkedTasks={linkedTasks}
            projectMembers={availableMembers}
            onLinkedTaskAdded={() => fetchProjectAndTaskDetails()}
            onLinkedTaskUpdated={() => fetchProjectAndTaskDetails()}
            canEdit={permissionLevel === "admin" || permissionLevel === "edit"}
            taskStatus={task?.status}
          />
        </div>

        <div className="space-y-6">
          <TaskSidebar
            task={task}
            isEditing={isEditing}
            editedTask={editedTask}
            availableMembers={availableMembers}
            permissionLevel={permissionLevel}
            handleEditField={handleEditField}
            handleAssigneeChange={handleAssigneeChange}
            handleUpdateStatus={handleUpdateStatus}
          />
        </div>
      </div>
    </div>
  );
}
