import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ProjectWithDetails, Task } from "@/types/index";
import { useSocket } from "@/components/context/socket-context";

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
          setIsEditor(
            userMember.role === "EDITOR" || userMember.role === "ADMIN"
          );
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

  // Socket integration
  const { socket, joinProject, leaveProject } = useSocket();

  useEffect(() => {
    if (projectId && socket) {
      joinProject(projectId);

      const handleTaskUpdate = (updatedTask: Task) => {
        setTasks(prevTasks => {
          const taskIndex = prevTasks.findIndex(t => t.id === updatedTask.id);
          if (taskIndex !== -1) {
            // Merge updated task with existing task to preserve fields not in update
            const existingTask = prevTasks[taskIndex];
            const mergedTask = {
              ...existingTask,
              ...updatedTask,
              // Ensure project info is preserved
              project: updatedTask.project || existingTask.project,
            };
            const newTasks = [...prevTasks];
            newTasks[taskIndex] = mergedTask;
            return newTasks;
          }
          // Task doesn't exist in current list, ignore (might be from different project)
          return prevTasks;
        });
      };

      socket.on("task:updated", handleTaskUpdate);

      return () => {
        leaveProject(projectId);
        socket.off("task:updated", handleTaskUpdate);
      };
    }
  }, [projectId, socket, joinProject, leaveProject]);

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
