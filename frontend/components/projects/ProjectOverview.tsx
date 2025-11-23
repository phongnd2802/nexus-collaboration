"use client";

import { useSession } from "next-auth/react";
import ProjectMembers from "./ProjectMembers";
import { ProjectWithDetails, Task } from "@/types/index";
import { useProjectOverview } from "@/hooks/useProjectOverview";
import ProjectProgress from "./ProjectProgress";
import ProjectDetails from "./ProjectDetails";
import ProjectCompletionAlert from "./ProjectCompletionAlert";
import ProjectCompletionDialog from "./ProjectCompletionDialog";

interface ProjectOverviewProps {
  project: ProjectWithDetails;
  tasks: Task[];
  isAdmin: boolean;
  onProjectUpdated?: () => void;
}

export default function ProjectOverview({
  project,
  tasks,
  isAdmin,
  onProjectUpdated,
}: ProjectOverviewProps) {
  const { data: session } = useSession();
  const {
    isCompletionDialogOpen,
    setIsCompletionDialogOpen,
    isUpdatingStatus,
    showStatusPrompt,
    stats,
    handleMarkProjectCompleted,
  } = useProjectOverview({
    project,
    tasks,
    isAdmin,
    onProjectUpdated,
  });

  const handleMembersUpdated = () => {
    if (onProjectUpdated) {
      onProjectUpdated();
    }
  };

  return (
    <div className="space-y-8">
      {/* Project Progress */}
      <ProjectProgress
        completionPercentage={stats.completionPercentage}
        completedTasks={stats.completedTasks}
        inProgressTasks={stats.inProgressTasks}
        todoTasks={stats.todoTasks}
      >
        {showStatusPrompt && (
          <ProjectCompletionAlert
            onOpenDialog={() => setIsCompletionDialogOpen(true)}
          />
        )}
      </ProjectProgress>

      <div className="flex gap-4 flex-col md:flex-row">
        <ProjectMembers
          projectId={project.id}
          project={project}
          onMembersUpdated={handleMembersUpdated}
        />

        {/* Project Details */}
        <ProjectDetails project={project} session={session} />
      </div>

      <ProjectCompletionDialog
        open={isCompletionDialogOpen}
        onOpenChange={setIsCompletionDialogOpen}
        onConfirm={handleMarkProjectCompleted}
        isUpdating={isUpdatingStatus}
      />
    </div>
  );
}
