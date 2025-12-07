"use client";

import React from "react";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  HomeIcon,
  FolderIcon,
  CheckSquareIcon,
  PlusIcon,
  CalendarIcon,
  UsersIcon,
  UserIcon,
  SettingsIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

export function UnifiedBreadcrumb() {
  const t = useTranslations("UnifiedBreadcrumb");
  const pathname = usePathname();
  const params = useParams();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [taskName, setTaskName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const segments = pathname.split("/").filter(Boolean);
  const projectId = params?.id as string;
  const taskId = params?.taskId as string;
  const locale = params?.locale as string;

  const showBreadcrumbs =
    pathname !== `/${locale}/dashboard` && pathname !== `/${locale}/messages`;

  useEffect(() => {
    setProjectName(null);
    setTaskName(null);
  }, [pathname, params]);

  useEffect(() => {
    if (projectId && !projectName) {
      const fetchProjectDetails = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/projects/${projectId}`);
          if (response.ok) {
            const data = await response.json();
            setProjectName(data.name);
          }
        } catch (error) {
          console.error("Failed to fetch project details:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchProjectDetails();
    }
  }, [projectId, projectName]);

  useEffect(() => {
    if (taskId && !taskName) {
      const fetchTaskDetails = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/tasks/${taskId}`);
          if (response.ok) {
            const data = await response.json();
            setTaskName(data.title);
          }
        } catch (error) {
          console.error("Failed to fetch task details:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchTaskDetails();
    }
  }, [taskId, taskName]);

  if (!showBreadcrumbs) {
    return null;
  }

  const getBreadcrumbIcon = (segment: string) => {
    switch (segment) {
      case "projects":
        return <FolderIcon className="h-4 w-4 mr-1" />;
      case "tasks":
        return <CheckSquareIcon className="h-4 w-4 mr-1" />;
      case "calendar":
        return <CalendarIcon className="h-4 w-4 mr-1" />;
      case "team":
        return <UsersIcon className="h-4 w-4 mr-1" />;
      case "profile":
        return <UserIcon className="h-4 w-4 mr-1" />;
      case "settings":
        return <SettingsIcon className="h-4 w-4 mr-1" />;
      case "create":
        return <PlusIcon className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  const formatSegmentName = (segment: string) => {
    if (segment === "taskId") return t("taskDetails");

    const translationKey = segment.replace(/-/g, "") as any

    // List of known static segments that we have translations for
    const knownSegments = [
      "dashboard",
      "projects",
      "tasks",
      "calendar",
      "team",
      "profile",
      "settings",
      "create",
    ];

    if (knownSegments.includes(segment)) {
      return t(segment);
    }

    return (
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
    );
  };

  return (
    <Breadcrumb className="pb-2 pt-2">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard" className="flex items-center">
              <HomeIcon className="h-4 w-4 mr-1" />
              <span className="sr-only md:not-sr-only md:inline-block">
                {t("dashboard")}
              </span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {segments.map((segment, index) => {
          if (segment === "(workspace)") return null;
          if (segment === locale) return null;

          if (
            segment === "id" ||
            segment === "taskId" ||
            segment === projectId ||
            segment === taskId
          )
            return null;

          if (segment === "create" && segments[index + 1] === projectId)
            return null;

          const isLast = index === segments.length - 1 && !projectId && !taskId;
          const href = `/${segments.slice(0, index + 1).join("/")}`;

          return (
            <React.Fragment key={segment}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="flex items-center">
                    {getBreadcrumbIcon(segment)}
                    {formatSegmentName(segment)}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href} className="flex items-center">
                      {getBreadcrumbIcon(segment)}
                      {formatSegmentName(segment)}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}

        {/* Project specific breadcrumb */}
        {projectId && (
  <>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      {taskId ? (
        <BreadcrumbLink asChild>
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center min-w-0" /* cho phép con co nhỏ */
          >
            {isLoading ? (
              <span className="h-4 w-20 bg-muted rounded animate-pulse"></span>
            ) : (
              /* wrapper có truncate và max width */
              <span className="block truncate max-w-[12rem] sm:max-w-[20rem]">
                {projectName || t("projectDetails")}
              </span>
            )}
          </Link>
        </BreadcrumbLink>
      ) : (
        <BreadcrumbPage className="flex items-center min-w-0">
          {isLoading ? (
            <span className="h-4 w-20 bg-muted rounded animate-pulse"></span>
          ) : (
            <span className="block truncate max-w-[12rem] sm:max-w-[20rem]">
              {projectName || t("projectDetails")}
            </span>
          )}
        </BreadcrumbPage>
      )}
    </BreadcrumbItem>
  </>
)}


        {/* Task specific breadcrumb */}
        {taskId && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center">
                <CheckSquareIcon className="h-4 w-4 mr-1" />
                {isLoading ? (
                  <span className="h-4 w-20 bg-muted rounded animate-pulse"></span>
                ) : (
                  taskName || t("taskDetails")
                )}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}

        {segments.includes("create") && (
          <>
            {segments.includes("projects") && !segments.includes("tasks") && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="flex items-center">
                    <PlusIcon className="h-4 w-4 mr-1" />
                    {t("createProject")}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}

            {segments.includes("tasks") && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="flex items-center">
                    <PlusIcon className="h-4 w-4 mr-1" />
                    {t("createTask")}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
