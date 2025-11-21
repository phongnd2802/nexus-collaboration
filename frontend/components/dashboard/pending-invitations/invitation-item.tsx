import { memo } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, X, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { getRoleBadge } from "@/lib/badge-utils";
import { PendingInvitation, InvitationActionType } from "@/types/index";

interface InvitationItemProps {
  invitation: PendingInvitation;
  processingId: string | null;
  actionType: InvitationActionType;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

const InvitationItem = memo(({ 
  invitation, 
  processingId, 
  actionType, 
  onAccept, 
  onDecline 
}: InvitationItemProps) => {
  const isProcessing = processingId === invitation.id;
  
  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Info Section */}
        <div>
          <h3 className="font-medium">{invitation.projectName}</h3>
          <div className="text-sm text-muted-foreground mt-1">
            <span className="mr-2">
              Invited by {invitation.inviterName} to join as
            </span>
            {getRoleBadge(invitation.role)}
          </div>
          <div className="text-xs text-muted-foreground mt-2 flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            Expires: {format(new Date(invitation.expiresAt), "MMM d, yyyy")}
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => onDecline(invitation.id)}
            disabled={isProcessing}
          >
            {isProcessing && actionType === "Decline" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="h-4 w-4 mr-1" />
                Decline
              </>
            )}
          </Button>
          
          <Button
            size="sm"
            className="bg-violet-700 hover:bg-violet-800 text-white"
            onClick={() => onAccept(invitation.id)}
            disabled={isProcessing}
          >
            {isProcessing && actionType === "Accept" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                Accept
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});

InvitationItem.displayName = "InvitationItem";

export default InvitationItem;