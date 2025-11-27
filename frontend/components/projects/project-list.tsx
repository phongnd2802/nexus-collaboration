import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ProjectCard from "@/components/projects/ProjectCard";
import { ProjectWithDetails } from "@/hooks/use-projects";
import { useTranslations } from "next-intl";

interface ProjectListProps {
  isLoading: boolean;
  projects: ProjectWithDetails[];
  filteredProjects: ProjectWithDetails[];
  clearFilters: () => void;
}

export function ProjectList({
  isLoading,
  projects,
  filteredProjects,
  clearFilters,
}: ProjectListProps) {
  const t = useTranslations("ProjectsPage.list");
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <Card key={index} className="h-full">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-1/2 rounded-md" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full mt-2 rounded-md" />
              <Skeleton className="h-4 w-2/3 mt-2 rounded-md" />
            </CardHeader>

            <CardContent>
              <div className="flex items-center mb-3">
                <Skeleton className="h-4 w-1/3 rounded-md" />
                <Skeleton className="h-4 w-1/3 ml-auto rounded-md" />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex -space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-8 rounded-full" />
                  ))}
                </div>
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>

              <div className="space-y-1 mt-4 w-full">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-4 w-8 rounded-md" />
                </div>
                <Skeleton className="h-2 w-full rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t("noProjects")}
          </h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            {t("createFirstProject")}
          </p>
          <Button asChild>
            <Link href="/projects/create">
              <PlusCircle className="h-4 w-4 mr-2" />
              {t("createNewProject")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (filteredProjects.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <h3 className="text-lg font-medium text-foreground mb-2">
           {t("noProjects")}
          </h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            {t("tryAdjustingFilters")}
          </p>
          <Button
            variant="default"
            onClick={clearFilters}
          >
            {t("clearFilters")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredProjects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          memberCount={project.memberCount}
          completionPercentage={project.completionPercentage}
          members={project.members}
        />
      ))}
    </div>
  );
}
