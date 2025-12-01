import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ProjectWithDetails, Task } from "@/types/index";

interface UseProjectDataReturn {
  project: ProjectWithDetails | null;
  tasks: Task[];
  isProjectLoading: boolean;
  isTasksLoading: boolean;
  userRole: string | null;
  isAdmin: boolean;
  isEditor: boolean;
  fetchProjectData: () => Promise<void>;
  fetchTasksData: () => Promise<void>;
  setTasks: (tasks: Task[]) => void;
}

export function useProjectData(projectId: string): UseProjectDataReturn {
  const { data: session, status } = useSession();
  
  const [project, setProject] = useState<ProjectWithDetails | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isProjectLoading, setIsProjectLoading] = useState(true);
  const [isTasksLoading, setIsTasksLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    
    setIsProjectLoading(true);
    try {
      const projectRes = await fetch(`/api/projects/${projectId}`);

      if (!projectRes.ok) {
        throw new Error("Failed to fetch project");
      }

      const projectData = await projectRes.json();
      setProject(projectData);

      // user role and admin check
      const userId = session?.user?.id;
      const isCreator =
        projectData.ownerId === userId || projectData.creatorId === userId;

      if (isCreator) {
        setUserRole("ADMIN");
        setIsAdmin(true);
        setIsEditor(true); // Admin is also an editor
      } else if (projectData.members) {
        const userMember = projectData.members.find(
          (m: any) => m.userId === userId || m.user?.id === userId
        );
        if (userMember) {
          setUserRole(userMember.role);
          setIsEditor(userMember.role === "EDITOR" || userMember.role === "ADMIN");
          setIsAdmin(userMember.role === "ADMIN");
        }
      }
    } catch (error) {
      console.error("Error fetching project data:", error);
      toast.error("Failed to load project data");
    } finally {
      setIsProjectLoading(false);
    }
  }, [projectId, session?.user?.id]);

  const fetchTasksData = useCallback(async () => {
    if (!projectId) return;

    setIsTasksLoading(true);
    try {
      const tasksRes = await fetch(`/api/tasks/project/${projectId}`);

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }
    } catch (error) {
      console.error("Error fetching tasks data:", error);
      toast.error("Failed to load tasks data");
    } finally {
      setIsTasksLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (status === "authenticated" && projectId) {
      fetchProjectData();
      fetchTasksData();
    }
  }, [status, projectId, fetchProjectData, fetchTasksData]);

  return {
    project,
    tasks,
    isProjectLoading,
    isTasksLoading,
    userRole,
    isAdmin,
    isEditor,
    fetchProjectData,
    fetchTasksData,
    setTasks,
  };
}
