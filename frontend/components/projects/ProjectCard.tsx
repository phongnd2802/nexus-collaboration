import Link from "next/link";
import { Calendar, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getProfileUrl } from "@/lib/profile-utils";
import { getInitials, formatDate } from "@/lib/utils";
import { getStatusBadge } from "@/lib/badge-utils";
import { Project, ProjectMember } from "@/types/index";
import { useLocale, useTranslations } from "next-intl";

interface ProjectCardProps {
  project: Project;
  memberCount: number;
  completionPercentage: number;
  members: ProjectMember[];
}

export default function ProjectCard({
  project,
  memberCount,
  completionPercentage,
  members,
}: ProjectCardProps) {
  const t = useTranslations("DashboardPage.projectCard");
  const locale = useLocale();
  const { data: session } = useSession();

  const truncateDescription = (desc: string | null, maxLength = 100) => {
    if (!desc) return t("noDescription");
    return desc.length > maxLength
      ? `${desc.substring(0, maxLength)}...`
      : desc;
  };

  return (
    <Link href={`/projects/${project.id}`} className="block group">
      <Card className="h-full transition-all hover:shadow-md hover:bg-muted/30 dark:hover:bg-muted/20">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="font-medium! text-lg text-foreground line-clamp-1 wrap-break-word">
              {project.name}
            </CardTitle>
            {getStatusBadge(project.status, t)}
          </div>
          <CardDescription>
            {truncateDescription(project.description)}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex items-center text-xs text-muted-foreground mb-3 truncate">
            <Users className="h-3.5 w-3.5 mr-1" />
            <span>
              {memberCount} {t("members")}
            </span>
            <span className="mx-2">•</span>
            <Calendar className="h-3.5 w-3.5 mr-1" />
            <span>{formatDate(project.dueDate, t, locale)}</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex -space-x-2">
              {members.slice(0, 3).map((member) => (
                <Avatar
                  key={member.user.id + member.user.name}
                  className="h-8 w-8 border-2 border-background hover:z-10 transition-transform hover:scale-105"
                  onClick={(e) => {
                    e.preventDefault(); // Prevent link navigation
                    window.location.href = getProfileUrl(
                      member.user.email || "",
                      session?.user?.email || ""
                    );
                  }}
                >
                  <AvatarImage
                    src={member?.user?.image!}
                    alt={member?.user?.name!}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-linear-to-br from-main to-main text-white">
                    {getInitials(member.user.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {members.length > 3 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                  +{members.length - 3}
                </div>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-0 mt-auto">
          <div className="space-y-1 w-full">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("progress")}</span>
              <span>{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-1.5" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
