"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddLinkedTaskDialog from "./AddLinkedTaskDialog";
import LinkedTaskItem from "./LinkedTaskItem";
import { useLinkedTasks } from "@/hooks/useLinkedTasks";
import { useTranslations } from "next-intl";

interface LinkedTask {
  id: string; // This is the link ID
  name: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  assigneeId: string;
  assignee: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  status: "TODO" | "IN_PROGRESS" | "DONE";
  relationship: "BLOCKED_BY" | "BLOCKS";
  linkedTaskId?: string; // The actual task ID
}

interface Member {
  id: string;
  name: string | null;
  email?: string;
  image?: string | null;
}

interface LinkedTaskSectionProps {
  taskId: string;
  projectId: string;
  linkedTasks: LinkedTask[];
  projectMembers: Member[];
  onLinkedTaskAdded: () => void;
  onLinkedTaskUpdated: () => void;
  canEdit: boolean;
  taskStatus?: "TODO" | "IN_PROGRESS" | "DONE";
}

export default function LinkedTaskSection({
  taskId,
  projectId,
  linkedTasks,
  projectMembers,
  onLinkedTaskAdded,
  onLinkedTaskUpdated,
  canEdit,
  taskStatus,
}: LinkedTaskSectionProps) {
  const t = useTranslations("TaskDetailPage")
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { handleUpdateLinkedTask, handleDeleteLinkedTask } = useLinkedTasks({
    taskId,
    linkedTasks,
    onLinkedTaskUpdated,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{t("linkedTask")}</CardTitle>
          {canEdit && taskStatus !== "DONE" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("addLink")}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {linkedTasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("noLinkedTasks")}
          </p>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[minmax(110px,200px)_minmax(60px,90px)_minmax(104px,130px)_minmax(81px,110px)_minmax(120px,120px)_auto] gap-3 text-xs font-medium text-muted-foreground pb-2 border-b text-left">
              <div>{t("name")}</div>
              <div>{t("priority")}</div>
              <div>{t("assignee")}</div>
              <div>{t("status")}</div>
              <div>{t("relationship")}</div>
              <div></div>
            </div>

            {/* Rows */}
            {linkedTasks.map((linkedTask) => (
              <LinkedTaskItem
                key={linkedTask.id}
                linkedTask={linkedTask}
                projectMembers={projectMembers}
                canEdit={canEdit}
                onUpdate={handleUpdateLinkedTask}
                onDelete={handleDeleteLinkedTask}
                taskStatus={taskStatus}
              />
            ))}
          </div>
        )}
      </CardContent>

      <AddLinkedTaskDialog
        taskId={taskId}
        projectId={projectId}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={onLinkedTaskAdded}
      />
    </Card>
  );
}
