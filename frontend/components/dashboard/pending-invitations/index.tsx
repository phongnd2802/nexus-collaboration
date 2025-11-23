"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { usePendingInvitations } from "@/hooks/use-pending-invitations";
import InvitationItem from "./invitation-item"

interface PendingInvitationsSectionProps {
  onInvitationAction?: () => void;
}

export default function PendingInvitationsSection({
  onInvitationAction,
}: PendingInvitationsSectionProps) {
  const {
    invitations,
    isLoading,
    processingId,
    actionType,
    acceptInvitation,
    declineInvitation,
  } = usePendingInvitations(onInvitationAction);

  // Loading State
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-violet-700" />
        </CardContent>
      </Card>
    );
  }

  // Empty State
  if (invitations.length === 0) {
    return null;
  }

  // Render List
  return (
    <>
      <span className="flex items-center p-0 m-0 mb-4">
        Pending Invitations
        <Badge className="ml-2 bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
          {invitations.length}
        </Badge>
      </span>
      
      <div className="space-y-4">
        {invitations.map((invitation) => (
          <InvitationItem
            key={invitation.id}
            invitation={invitation}
            processingId={processingId}
            actionType={actionType}
            onAccept={acceptInvitation}
            onDecline={declineInvitation}
          />
        ))}
      </div>
    </>
  );
}