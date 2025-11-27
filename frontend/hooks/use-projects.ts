import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Project, ProjectMember } from "@/types/index";

export interface ProjectWithDetails extends Project {
  memberCount: number;
  completionPercentage: number;
  members: ProjectMember[];
}

export function useProjects() {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    setIsInitialRender(false);
  }, []);

  // Fetch all projects when authenticated
  useEffect(() => {
    if (session?.user?.id) {
      fetchProjects();
    }
  }, [session?.user?.id]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/dashboard/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      } else {
        toast.error("Failed to load projects");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (project) =>
          project.name.toLowerCase().includes(query) ||
          (project.description &&
            project.description.toLowerCase().includes(query))
      );
    }

    // status filter
    if (statusFilter.length > 0) {
      result = result.filter((project) =>
        statusFilter.includes(project.status)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "dueDate":
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1;
          else if (!b.dueDate) comparison = -1;
          else
            comparison =
              new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case "memberCount":
          comparison = (a.memberCount || 0) - (b.memberCount || 0);
          break;
        case "progress":
          comparison = (a.completionPercentage || 0) - (b.completionPercentage || 0);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [projects, searchQuery, statusFilter, sortBy, sortOrder]);

  const toggleStatusFilter = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter([]);
    setSortBy("name");
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
    projects,
    filteredProjects,
    isLoading,
    isInitialRender,
    searchQuery,
    setSearchQuery,
    statusFilter,
    toggleStatusFilter,
    sortBy,
    sortOrder,
    toggleSort,
    clearFilters,
    fetchProjects,
    status, // session status
  };
}
