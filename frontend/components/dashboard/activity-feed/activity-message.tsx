import Link from "next/link";
import { Activity } from "@/types/index";
import { useTranslations } from "next-intl";

interface ActivityMessageProps {
  activity: Activity;
}

const ActivityLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <Link
    href={href}
    className="text-main hover:underline font-medium dark:text-main"
  >
    {children}
  </Link>
);

export function ActivityMessage({ activity }: ActivityMessageProps) {
  const t = useTranslations("ActivityFeed");
  const {
    type,
    projectId,
    projectName,
    entityId,
    entityTitle,
    details,
    targetUser,
  } = activity;

  switch (type) {
    case "PROJECT_CREATED":
      return (
        <span>
          {t("createdProject")}{" "}
          <ActivityLink href={`/projects/${projectId}`}>
            {projectName}
          </ActivityLink>
        </span>
      );

    case "MEMBER_ADDED":
      return (
        <span>
          {t("added")}{" "}
          <span className="font-medium">
            {targetUser?.name || t("aNewUser")}
          </span>{" "}
          {t("toProject")}{" "}
          <ActivityLink href={`/projects/${projectId}`}>
            {projectName}
          </ActivityLink>
          {details?.role && (
            <span className="text-muted-foreground">
              {" "}
              {t("as")} {details.role.toLowerCase()}
            </span>
          )}
        </span>
      );

    case "TASK_CREATED":
      return (
        <span>
          {t("createdTask")}{" "}
          <ActivityLink href={`/tasks/${entityId}`}>{entityTitle}</ActivityLink>{" "}
          {t("inProject")}{" "}
          <ActivityLink href={`/projects/${projectId}`}>
            {projectName}
          </ActivityLink>
        </span>
      );

    case "TASK_UPDATED":
      return (
        <span>
          {t("updatedTask")}{" "}
          <ActivityLink href={`/tasks/${entityId}`}>{entityTitle}</ActivityLink>
          {details?.oldStatus && details?.newStatus && (
            <span>
              {" "}
              {t("from")}{" "}
              <span className="font-medium">
                {details.oldStatus.toLowerCase()}
              </span>{" "}
              {t("to")}{" "}
              <span className="font-medium">
                {details.newStatus.toLowerCase()}
              </span>
            </span>
          )}
        </span>
      );

    case "TASK_COMPLETED":
      return (
        <span>
          {t("completedTask")}{" "}
          <ActivityLink href={`/tasks/${entityId}`}>{entityTitle}</ActivityLink>{" "}
          {t("inProject")}{" "}
          <ActivityLink href={`/projects/${projectId}`}>
            {projectName}
          </ActivityLink>
        </span>
      );

    case "PROJECT_UPDATED":
      return (
        <span>
          {t("updatedProject")}{" "}
          <ActivityLink href={`/projects/${projectId}`}>
            {projectName}
          </ActivityLink>
          {details?.status && (
            <span>
              {" "}
              {t("to")}{" "}
              <span className="font-medium">
                {details.status.toLowerCase()}
              </span>
            </span>
          )}
        </span>
      );

    default:
      return (
        <span>
          {t("activityInProject")} {projectName}
        </span>
      );
  }
}
