import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ProjectWithDetails, Task, Activity } from "@/types/index";

interface DashboardStats {
  totalProjects: number;
  completedTasks: number;
  pendingTasks: number;
  upcomingDeadlines: number;
}

interface UseDashboardDataReturn {
  projects: ProjectWithDetails[];
  displayTasks: Task[];
  activities: Activity[];
  stats: DashboardStats;
  isLoading: boolean;
  showInvitations: boolean;
  fetchDashboardData: () => Promise<void>;
  checkPendingInvitations: () => Promise<void>;
}

export function useDashboardData(): UseDashboardDataReturn {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [displayTasks, setDisplayTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showInvitations, setShowInvitations] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    completedTasks: 0,
    pendingTasks: 0,
    upcomingDeadlines: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    try {
      const [projectsRes, allTasksRes, activityRes] = await Promise.all([
        fetch("/api/dashboard/projects?limit=4"),
        fetch("/api/tasks/all"),
        fetch("/api/dashboard/activity"),
      ]);

      // Projects response
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects);
        setStats((prev) => ({
          ...prev,
          totalProjects: projectsData.total,
        }));
      } else {
        toast.error("Failed to load projects");
      }

      if (allTasksRes.ok) {
        const allTasksData: Task[] = await allTasksRes.json();
        
        const currentUserId = session?.user?.id;
        const assignedTasks = allTasksData.filter(
          (task) => task.assignee && task.assignee.id === currentUserId
        );

        const completed = assignedTasks.filter(
          (t) => t.status === "DONE"
        ).length;
        const pending = assignedTasks.filter((t) => t.status !== "DONE").length;

        const upcoming = allTasksData.filter((t) => {
          if (!t.dueDate || t.status === "DONE") return false;
          const dueDate = new Date(t.dueDate);
          const today = new Date();
          const sevenDaysLater = new Date();
          sevenDaysLater.setDate(today.getDate() + 7);
          return dueDate >= today && dueDate <= sevenDaysLater;
        }).length;

        setStats((prev) => ({
          ...prev,
          completedTasks: completed,
          pendingTasks: pending,
          upcomingDeadlines: upcoming,
        }));
        
        const sortedAssignedTasks = [...assignedTasks].sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;

          const dateComparison =
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();

          if (dateComparison === 0) {
            if (!a.updatedAt && !b.updatedAt) return 0;
            if (!a.updatedAt) return 1;
            if (!b.updatedAt) return -1;
            return (
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
          }

          return dateComparison;
        });

        setDisplayTasks(sortedAssignedTasks.slice(0, 4));
      } else {
        toast.error("Failed to load tasks data");
      }

      // Activity response
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivities(activityData);
      } else {
        toast.error("Failed to load activity feed");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  const checkPendingInvitations = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const response = await fetch("/api/invitations/pending");
      if (response.ok) {
        const data = await response.json();
        setShowInvitations(data.length > 0);
      }
    } catch (error) {
      console.error("Error checking pending invitations:", error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardData();
      checkPendingInvitations();
    }
  }, [session?.user?.id, fetchDashboardData, checkPendingInvitations]);

  return {
    projects,
    displayTasks,
    activities,
    stats,
    isLoading,
    showInvitations,
    fetchDashboardData,
    checkPendingInvitations,
  };
}
