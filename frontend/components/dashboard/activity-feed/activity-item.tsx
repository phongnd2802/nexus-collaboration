import React, { useMemo } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getProfileUrl } from "@/lib/profile-utils";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import { Activity } from "@/types/index";

import { ACTIVITY_CONFIG } from "./constants";
import { ActivityMessage } from "./activity-message";
import { useLocale } from "next-intl";
import { useTranslations } from "use-intl";

interface ActivityItemProps {
  activity: Activity;
  currentUserEmail?: string | null;
}

// Component nhỏ để render Icon dựa trên config
const ActivityIcon = ({ type }: { type: string }) => {
  const config = ACTIVITY_CONFIG[type] || ACTIVITY_CONFIG.DEFAULT;
  const IconComponent = config.icon;
  return (
    <IconComponent
      className={`h-4 w-4 mr-2 mt-0.5 shrink-0 ${config.colorClass}`}
    />
  );
};

export const ActivityItem = React.memo(
  ({ activity, currentUserEmail }: ActivityItemProps) => {
    const locale = useLocale();
    const t = useTranslations("DashboardPage.activityFeed");
    // Memoize URL profile để tránh tính toán lại
    const profileUrl = useMemo(
      () => getProfileUrl(activity.userEmail, currentUserEmail),
      [activity.userEmail, currentUserEmail]
    );

    return (
      <div className="flex">
        {/* Avatar Section */}
        <Link
          href={profileUrl}
          className="cursor-pointer hover:opacity-80 transition-opacity"
        >
          <Avatar className="h-8 w-8 mr-2">
            <AvatarImage
              src={activity.userImage || ""}
              alt={activity.userName || "Unknown user"}
            />
            <AvatarFallback className="bg-violet-100 text-main text-xs">
              {getInitials(activity.userName)}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Content Section */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <Link
              href={profileUrl}
              className="text-sm font-medium hover:underline truncate line-clamp-2 break-words"
            >
              {activity.userName}
            </Link>
            <span className="text-xs text-muted-foreground ml-2">
              {formatRelativeTime(activity.createdAt, locale)}
            </span>
          </div>

          <div className="mt-1 p-2 bg-muted rounded-md text-sm text-foreground/90 flex">
            <ActivityIcon type={activity.type} />
            <p>
              <ActivityMessage activity={activity} />
            </p>
          </div>
        </div>
      </div>
    );
  }
);

ActivityItem.displayName = "ActivityItem";
