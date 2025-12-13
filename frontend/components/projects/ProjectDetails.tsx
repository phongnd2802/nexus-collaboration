import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { getProfileUrl } from "@/lib/profile-utils";
import { getInitials, formatDate } from "@/lib/utils";
import { ProjectWithDetails } from "@/types/index";
import { Session } from "next-auth";
import { useTranslations, useLocale } from "next-intl";

interface ProjectDetailsProps {
  project: ProjectWithDetails;
  session: Session | null;
}

export default function ProjectDetails({
  project,
  session,
}: ProjectDetailsProps) {
  const t = useTranslations("ProjectDetailPage");
  const locale = useLocale();

  return (
    <Card className="flex md:w-sm w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CalendarDays className="h-5 w-5 mr-2" />
          {t("projectDetails")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{t("createdBy")}</p>
            <div className="flex items-center mt-1">
              <Link
                href={getProfileUrl(
                  project.creator?.email || "",
                  session?.user?.email || ""
                )}
              >
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage
                    src={project.creator?.image || ""}
                    alt={project.creator?.name || ""}
                    className="object-cover cursor-pointer"
                  />
                  <AvatarFallback className="bg-violet-100 text-main text-xs">
                    {getInitials(project.creator?.name ?? null)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <span className="cursor-pointer">
                {project.creator?.name || "Unknown"}
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">{t("createdOn")}</p>
            <p>{formatDate(project.createdAt ?? null, useTranslations(), locale)}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">{t("dueDate")}</p>
            <p>
              {formatDate(project.dueDate, useTranslations(), locale, { includeTime: true })}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">{t("updatedOn")}</p>
            <p>{formatDate(project.updatedAt ?? null, useTranslations(), locale)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
