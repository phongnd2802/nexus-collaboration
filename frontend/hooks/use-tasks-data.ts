import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Task } from "@/types/index";

interface UseTasksDataReturn {
  tasks: Task[];
  filteredTasks: Task[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string[];
  setStatusFilter: (status: string[]) => void;
  priorityFilter: string[];
  setPriorityFilter: (priority: string[]) => void;
  sortBy: string;
  setSortBy: (sortBy: string) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  activeTab: "assigned" | "created";
  setActiveTab: (tab: "assigned" | "created") => void;
  fetchTasks: () => Promise<void>;
  getTaskCount: (type: "assigned" | "created", status?: string) => number;
  toggleStatusFilter: (status: string) => void;
  togglePriorityFilter: (priority: string) => void;
  clearFilters: () => void;
  toggleSort: (field: string) => void;
}

export function useTasksData(): UseTasksDataReturn {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [activeTab, setActiveTab] = useState<"assigned" | "created">("assigned");

  const fetchTasks = useCallback(async () => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/tasks/all");
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        toast.error("Failed to load tasks");
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchTasks();
    }
  }, [session?.user?.id, fetchTasks]);

  useEffect(() => {
    let result = [...tasks];

    if (activeTab === "assigned") {
      result = result.filter(
        (task) => task.assignee && task.assignee.id === session?.user?.id
      );
    } else {
      result = result.filter((task) => task.creator?.id === session?.user?.id);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          (task.description &&
            task.description.toLowerCase().includes(query)) ||
          task.project?.name.toLowerCase().includes(query)
      );
    }

    if (statusFilter.length > 0) {
      result = result.filter((task) => statusFilter.includes(task.status));
    }

    if (priorityFilter.length > 0) {
      result = result.filter((task) => priorityFilter.includes(task.priority));
    }

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "priority":
          const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
          comparison =
            priorityOrder[a.priority as keyof typeof priorityOrder] -
            priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case "status":
          const statusOrder = { TODO: 0, IN_PROGRESS: 1, DONE: 2 };
          comparison =
            statusOrder[a.status as keyof typeof statusOrder] -
            statusOrder[b.status as keyof typeof statusOrder];
          break;
        case "dueDate":
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1;
          else if (!b.dueDate) comparison = -1;
          else
            comparison =
              new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredTasks(result);
  }, [
    tasks,
    searchQuery,
    statusFilter,
    priorityFilter,
    sortBy,
    sortOrder,
    activeTab,
    session?.user?.id,
  ]);

  const getTaskCount = useCallback((type: "assigned" | "created", status?: string) => {
    const filtered = tasks.filter((task) => {
      const isCorrectType =
        type === "assigned"
          ? task.assignee && task.assignee.id === session?.user?.id
          : task.creator?.id === session?.user?.id;

      return status ? isCorrectType && task.status === status : isCorrectType;
    });

    return filtered.length;
  }, [tasks, session?.user?.id]);

  const toggleStatusFilter = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const togglePriorityFilter = (priority: string) => {
    setPriorityFilter((prev) =>
      prev.includes(priority)
        ? prev.filter((p) => p !== priority)
        : [...prev, priority]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter([]);
    setPriorityFilter([]);
    setSortBy("dueDate");
    setSortOrder("asc");
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  return {
    tasks,
    filteredTasks,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    activeTab,
    setActiveTab,
    fetchTasks,
    getTaskCount,
    toggleStatusFilter,
    togglePriorityFilter,
    clearFilters,
    toggleSort,
  };
}
