"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddSubtaskDialog from "./AddSubtaskDialog";
import SubtaskItem from "./SubtaskItem";
import { useSubtasks } from "@/hooks/useSubtasks";
import { useTranslations } from "next-intl";

interface Subtask {
  id: string;
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
}

interface Member {
  id: string;
  name: string | null;
  email?: string;
  image?: string | null;
}

interface SubtaskSectionProps {
  taskId: string;
  subtasks: Subtask[];
  projectMembers: Member[];
  onSubtaskAdded: () => void;
  onSubtaskUpdated: () => void;
  canEdit: boolean;
  taskStatus?: "TODO" | "IN_PROGRESS" | "DONE";
}

export default function SubtaskSection({
  taskId,
  subtasks,
  projectMembers,
  onSubtaskAdded,
  onSubtaskUpdated,
  canEdit,
  taskStatus,
}: SubtaskSectionProps) {
  const t = useTranslations("TaskDetailPage");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const {
    editingNameId,
    editingName,
    setEditingName,
    handleUpdateSubtask,
    handleNameEdit,
    handleNameSave,
    handleDeleteSubtask,
    setEditingNameId,
  } = useSubtasks({
    taskId,
    subtasks,
    onSubtaskUpdated,
  });

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{t("subtask")}</CardTitle>
          {canEdit && taskStatus !== "DONE" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("addSubtask")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {subtasks.length === 0 ? (
          <p className="text-muted-foreground py-8">
            {t("noSubtasks")}
          </p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[minmax(122px,208px)_minmax(60px,85px)_minmax(100px,175px)_minmax(130px,150px)_auto] gap-3 text-xs font-medium text-muted-foreground pb-2 border-b text-left">
              <div>{t("name")}</div>
              <div>{t("priority")}</div>
              <div>{t("assignee")}</div>
              <div>{t("status")}</div>
              <div></div>
            </div>
            {subtasks.map((subtask) => (
              <SubtaskItem
                key={subtask.id}
                subtask={subtask}
                projectMembers={projectMembers}
                canEdit={canEdit}
                editingNameId={editingNameId}
                editingName={editingName}
                setEditingName={setEditingName}
                onUpdate={handleUpdateSubtask}
                onNameEdit={handleNameEdit}
                onNameSave={handleNameSave}
                onDelete={handleDeleteSubtask}
                setEditingNameId={setEditingNameId}
                taskStatus={taskStatus}
              />
            ))}
          </div>
        )}
      </CardContent>

      <AddSubtaskDialog
        taskId={taskId}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={onSubtaskAdded}
        projectMembers={projectMembers}
      />
    </Card>
  );
}
