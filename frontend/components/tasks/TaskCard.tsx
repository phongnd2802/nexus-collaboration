"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, FolderKanban } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getStatusBadge, getPriorityBadge } from "@/lib/badge-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getProfileUrl } from "@/lib/profile-utils";
import { getInitials, formatDate, isOverdue } from "@/lib/utils";
import { Task } from "@/types/index";
interface TaskCardProps {
  task: Task;
  currentUserId?: string;
}

export default function TaskCard({ task, currentUserId }: TaskCardProps) {
  const t = useTranslations("DashboardPage.taskCard");
  const locale = useLocale();
  const { data: session } = useSession();
  const router = useRouter();

  const handleTaskClick = () => {
    router.push(`/tasks/${task.id}`);
  };

  const handleProjectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.projectId) {
      router.push(`/projects/${task.projectId}`);
    }
  };

  return (
    <Card
      className="transition-all cursor-pointer h-full flex flex-col dark:hover:bg-muted/20 hover:shadow-md hover:bg-muted/30"
      onClick={handleTaskClick}
    >
      <CardContent className="p-4 pt-0 grow">
        <div className="flex items-start justify-between pb-2 gap-1">
          {task.project && (
            <button
              onClick={handleProjectClick}
              className="text-md text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center bg-transparent border-0 p-0 cursor-pointer text-left"
            >
              <FolderKanban className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="line-clamp-2 break-words">
                {task.project.name}
              </span>
            </button>
          )}
          <div className="flex items-center space-x-2">
            {getStatusBadge(task.status, t)}
            {getPriorityBadge(task.priority, t)}
          </div>
        </div>
        <div className="flex flex-col min-h-0 pb-4">
          <h3 className="font-medium text-foreground text-lg line-clamp-2">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {task.description}
            </p>
          )}
          <div
            className={`flex items-center text-xs mt-auto pt-4 ${
              isOverdue(task.dueDate, task.status)
                ? "text-rose-600 dark:text-rose-400"
                : "text-muted-foreground"
            }`}
          >
            <Calendar className="h-3.5 w-3.5 mr-1" />
            <span>
              {isOverdue(task.dueDate, task.status) ? "Overdue: " : ""}
              {formatDate(task.dueDate, t, locale, {
                relative: true,
                includeTime: true,
              })}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex items-center justify-between w-full border-t pt-4 mt-auto">
          {task.assignee ? (
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground mb-2">
                {t("assignee")}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={task.assignee.image || ""}
                        alt={task.assignee.name || ""}
                        className="object-cover cursor-pointer"
                        onClick={() => {
                          window.location.href = getProfileUrl(
                            task?.assignee?.email!,
                            session?.user?.email
                          );
                        }}
                      />
                      <AvatarFallback className="bg-violet-100 text-main text-xs">
                        {getInitials(task.assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {task.assignee.name}
                      {task.assignee.id === currentUserId && " (You)"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">{t("unassigned")}</div>
          )}

          {task.creator && (
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground mb-2">
                {t("creator")}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={task.creator.image || ""}
                        alt={task.creator.name || ""}
                        className="object-cover cursor-pointer"
                        onClick={() => {
                          window.location.href = getProfileUrl(
                            task?.creator?.email!,
                            session?.user?.email
                          );
                        }}
                      />
                      <AvatarFallback className="bg-gray-100 text-gray-700 text-xs">
                        {getInitials(task.creator.name)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {task.creator.name}
                      {task.creator.id === currentUserId && " (You)"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
