"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddLinkedTaskDialog from "./AddLinkedTaskDialog";
import LinkedTaskItem from "./LinkedTaskItem";
import { useLinkedTasks } from "@/hooks/useLinkedTasks";

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
}

export default function LinkedTaskSection({
  taskId,
  projectId,
  linkedTasks,
  projectMembers,
  onLinkedTaskAdded,
  onLinkedTaskUpdated,
  canEdit,
}: LinkedTaskSectionProps) {
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
          <CardTitle className="text-lg font-semibold">Linked task</CardTitle>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add link
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {linkedTasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No linked tasks yet
          </p>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[minmax(140px,220px)_minmax(70px,100px)_minmax(100px,130px)_minmax(60px,100px)_minmax(120px,120px)_auto] gap-3 text-xs font-medium text-muted-foreground pb-2 border-b text-left">
              <div>Name</div>
              <div>Priority</div>
              <div>Assignee</div>
              <div>Status</div>
              <div>Relationship</div>
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
