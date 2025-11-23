import React from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "@/types/index";

import { ActivityEmptyState } from "./activity-empty-state";
import { ActivityItem } from "./activity-item";

interface ActivityFeedProps {
  activities: Activity[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const { data: session } = useSession();
  const currentUserEmail = session?.user?.email;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <ActivityEmptyState />
        ) : (
          <div className="space-y-6">
            {activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                currentUserEmail={currentUserEmail}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}