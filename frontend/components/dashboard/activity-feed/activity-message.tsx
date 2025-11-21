import Link from "next/link";
import { Activity } from "@/types/index";

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
    className="text-violet-700 hover:underline font-medium dark:text-violet-400"
  >
    {children}
  </Link>
);

export function ActivityMessage({ activity }: ActivityMessageProps) {
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
          Created project{" "}
          <ActivityLink href={`/projects/${projectId}`}>
            {projectName}
          </ActivityLink>
        </span>
      );

    case "MEMBER_ADDED":
      return (
        <span>
          Added{" "}
          <span className="font-medium">
            {targetUser?.name || "a new user"}
          </span>{" "}
          to project{" "}
          <ActivityLink href={`/projects/${projectId}`}>
            {projectName}
          </ActivityLink>
          {details?.role && (
            <span className="text-muted-foreground">
              {" "}
              as {details.role.toLowerCase()}
            </span>
          )}
        </span>
      );

    case "TASK_CREATED":
      return (
        <span>
          Created task{" "}
          <ActivityLink href={`/tasks/${entityId}`}>{entityTitle}</ActivityLink>{" "}
          in project{" "}
          <ActivityLink href={`/projects/${projectId}`}>
            {projectName}
          </ActivityLink>
        </span>
      );

    case "TASK_UPDATED":
      return (
        <span>
          Updated task{" "}
          <ActivityLink href={`/tasks/${entityId}`}>{entityTitle}</ActivityLink>
          {details?.oldStatus && details?.newStatus && (
            <span>
              {" "}
              from{" "}
              <span className="font-medium">
                {details.oldStatus.toLowerCase()}
              </span>{" "}
              to{" "}
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
          Completed task{" "}
          <ActivityLink href={`/tasks/${entityId}`}>{entityTitle}</ActivityLink>{" "}
          in project{" "}
          <ActivityLink href={`/projects/${projectId}`}>
            {projectName}
          </ActivityLink>
        </span>
      );

    case "PROJECT_UPDATED":
      return (
        <span>
          Updated project{" "}
          <ActivityLink href={`/projects/${projectId}`}>
            {projectName}
          </ActivityLink>
          {details?.status && (
            <span>
              {" "}
              to{" "}
              <span className="font-medium">
                {details.status.toLowerCase()}
              </span>
            </span>
          )}
        </span>
      );

    default:
      return <span>Activity in project {projectName}</span>;
  }
}