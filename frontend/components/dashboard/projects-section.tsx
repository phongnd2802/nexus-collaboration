import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ProjectCard from "@/components/projects/ProjectCard";
import { ProjectWithDetails } from "@/types/index";
import { useTranslations } from "next-intl";

interface ProjectsSectionProps {
  projects: ProjectWithDetails[];
}

export default function ProjectsSection({ projects }: ProjectsSectionProps) {
  const t = useTranslations("DashboardPage.projectSection");
  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center justify-between">
        <h2 className="text-xl font-semibold">{t("yourProjects")}</h2>
        <Button
          asChild
          variant="neutral"
          className="text-sm text-muted-foreground hover:text-main dark:hover:text-main"
          size="sm"
        >
          <Link href="/projects" className="flex items-center">
            {t("viewAll")}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t("noProjects")}
            </h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              {t("createProject")}
            </p>
            <Button
              asChild
              variant="default"
            >
              <Link href="/projects/create">{t("createProject")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              memberCount={project.memberCount ?? 0}
              completionPercentage={project.completionPercentage ?? 0}
              members={project.members}
            />
          ))}
        </div>
      )}
    </div>
  );
}
