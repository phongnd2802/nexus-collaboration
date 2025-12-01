"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import ProjectsSection from "@/components/dashboard/projects-section";
import TasksSection from "@/components/dashboard/tasks-section";
import ActivityFeed from "@/components/dashboard/activity-feed";
import DashboardStats from "@/components/dashboard/dashboard-stats";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import PendingInvitationsSection from "@/components/dashboard/pending-invitations";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { LoadingState } from "@/components/ui/loading-state";

export default function DashboardPage() {
  const isMobile = useIsMobile();
  const { data: session, status } = useSession();
  const [isInitialRender, setIsInitialRender] = useState(true);

  const {
    projects,
    displayTasks,
    activities,
    stats,
    isLoading,
    showInvitations,
    fetchDashboardData,
    checkPendingInvitations,
  } = useDashboardData();

  useEffect(() => {
    setIsInitialRender(false);
  }, []);

  const handleInvitationAction = () => {
    checkPendingInvitations();
    fetchDashboardData();
  };

  if (status === "loading") {
    return <LoadingState />;
  }

  const firstName = session?.user?.name?.split(" ")[0] || "there";

  if (isLoading && isInitialRender) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-8">
      <WelcomeBanner
        userName={firstName}
        tasksDue={stats.upcomingDeadlines}
        projectsDue={stats.totalProjects}
      />

      {showInvitations &&
        (isLoading ? (
          <Skeleton className="w-full h-24 rounded-lg" />
        ) : (
          <PendingInvitationsSection
            onInvitationAction={handleInvitationAction}
          />
        ))}

      {!isMobile &&
        (isLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="w-full h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <DashboardStats stats={stats} />
        ))}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {isLoading ? (
            <Skeleton className="w-full h-64 rounded-lg" />
          ) : (
            <ProjectsSection projects={projects} />
          )}

          {isLoading ? (
            <Skeleton className="w-full h-64 rounded-lg" />
          ) : (
            <TasksSection
              tasks={displayTasks}
              currentUserId={session?.user?.id}
            />
          )}
        </div>

        {isLoading ? (
          <Skeleton className="w-full h-[500px] rounded-lg" />
        ) : (
          <ActivityFeed activities={activities} />
        )}
      </div>

      {isLoading && !isInitialRender && (
        <div className="fixed bottom-4 right-4 bg-background shadow-lg rounded-full p-2 z-50 border">
          <Loader2 className="h-6 w-6 animate-spin text-main dark:text-main" />
        </div>
      )}
    </div>
  );
}
