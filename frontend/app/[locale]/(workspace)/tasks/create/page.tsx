"use client";

import { useTranslations } from "next-intl";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clipboard } from "lucide-react";
import TaskForm from "@/components/tasks/TaskForm";

import { ProjectWithDetails } from "@/types/index";

function TaskPage() {
  const t = useTranslations("TasksPage.create");
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams?.get("projectId");

  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's projects when authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/tasks/create");
      return;
    }

    if (session?.user?.id) {
      fetchProjects();
    }
  }, [session?.user?.id, status, router]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/dashboard/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      } else {
        console.error("Failed to load projects");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskCreationSuccess = (taskId: string, projectId: string) => {
    setIsLoading(true);
    router.push(`/tasks/${taskId}`);
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex flex-col min-h-[80vh]">
        <div className="grow flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-main mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground mt-1">{t("description")}</p>
          </div>
        </div>
      </div>

      <TaskForm
        mode="create"
        initialProjectId={projectIdParam || undefined}
        projects={projects}
        isLoading={isLoading}
        onCancel={() => router.back()}
        onSuccess={handleTaskCreationSuccess}
      />
    </div>
  );
}

function LoadingTaskCreate() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="grow">
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-main" />
        </div>
      </main>
    </div>
  );
}

// Suspense boundary
export default function TaskCreate() {
  return (
    <Suspense fallback={<LoadingTaskCreate />}>
      <TaskPage />
    </Suspense>
  );
}
