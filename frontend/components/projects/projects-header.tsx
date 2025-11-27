import Link from "next/link";
import { PlusCircle, FolderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface ProjectsHeaderProps {
  isLoading: boolean;
}

export function ProjectsHeader({ isLoading }: ProjectsHeaderProps) {
  const t = useTranslations("ProjectsPage.header");
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FolderIcon className="h-7 w-7" />
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("description")}
        </p>
      </div>

      <Button asChild disabled={isLoading}>
        <Link href="/projects/create">
          <PlusCircle className="h-4 w-4 mr-2" />
          {t("newProject")}
        </Link>
      </Button>
    </div>
  );
}
