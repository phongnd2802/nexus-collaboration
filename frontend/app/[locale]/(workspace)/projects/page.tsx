"use client";

import { Loader2 } from "lucide-react";
import { useProjects } from "@/hooks/use-projects";
import { ProjectsHeader } from "@/components/projects/projects-header";
import { ProjectsFilter } from "@/components/projects/projects-filter";
import { ProjectList } from "@/components/projects/project-list";

export default function ProjectsPage() {
  const {
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
    status,
  } = useProjects();

  if (status === "loading") {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-main" />
      </div>
    );
  }

  if (isLoading && isInitialRender) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-main" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectsHeader isLoading={isLoading} />

      <ProjectsFilter
        isLoading={isLoading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        toggleStatusFilter={toggleStatusFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        toggleSort={toggleSort}
        clearFilters={clearFilters}
      />

      <ProjectList
        isLoading={isLoading}
        projects={projects}
        filteredProjects={filteredProjects}
        clearFilters={clearFilters}
      />

      {isLoading && !isInitialRender && (
        <div className="fixed bottom-4 right-4 bg-background shadow-lg rounded-full p-2 z-50 border">
          <Loader2 className="h-6 w-6 animate-spin text-main" />
        </div>
      )}
    </div>
  );
}
