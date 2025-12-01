"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectOverview from "@/components/projects/ProjectOverview";
import ProjectTasks from "@/components/projects/ProjectTasks";
import ProjectHeader from "@/components/projects/ProjectHeader";
import ProjectFiles from "@/components/projects/ProjectFiles";
import { Loader2 } from "lucide-react";
import { Task } from "@/types/index";
import { useProjectData } from "@/hooks/use-project-data";
import { LoadingState } from "@/components/ui/loading-state";
import { useTranslations } from "next-intl";

export default function ProjectDetailPage() {
  const t = useTranslations("ProjectDetailPage");
  const params = useParams();
  const id = params.id as string;
  const { status } = useSession();
  const [activeTab, setActiveTab] = useState("overview");

  const {
    project,
    tasks,
    isProjectLoading,
    isTasksLoading,
    userRole,
    isAdmin,
    isEditor,
    fetchProjectData,
    setTasks,
  } = useProjectData(id);

  const handleTasksUpdated = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
  };

  // Session loading state
  if (status === "loading") {
    return <LoadingState />;
  }

  // Project loading state or not found
  if (isProjectLoading) {
    return <LoadingState />;
  }

  if (!project) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="grow flex items-center justify-center flex-col p-8">
          <h2 className="text-2xl font-bold mb-4">{t("projectNotFound")}</h2>
          <p className="text-muted-foreground">
            {t("projectNotFoundDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="grow">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1">
              <ProjectHeader
                project={project}
                isAdmin={isAdmin}
                isEditor={isEditor}
                onProjectUpdated={fetchProjectData}
              />
            </div>
          </div>

          <Tabs
            defaultValue="overview"
            className="mt-6"
            onValueChange={(value) => setActiveTab(value)}
          >
            <TabsList>
              <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
              <TabsTrigger value="tasks">{t("tasks")}</TabsTrigger>
              <TabsTrigger value="files">{t("files")}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <ProjectOverview
                project={project}
                tasks={tasks}
                isAdmin={isAdmin}
                onProjectUpdated={fetchProjectData}
              />
            </TabsContent>

            <TabsContent value="tasks" className="mt-6">
              {isTasksLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-main mr-2" />
                  <span>{t("loadingTasks")}</span>
                </div>
              ) : (
                <ProjectTasks
                  id={id}
                  project={project}
                  tasks={tasks}
                  isAdmin={isAdmin}
                  isEditor={isEditor}
                  onTasksUpdated={handleTasksUpdated}
                />
              )}
            </TabsContent>

            <TabsContent value="files" className="mt-6">
              <ProjectFiles
                projectId={id}
                isAdmin={isAdmin}
                isEditor={isEditor}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
