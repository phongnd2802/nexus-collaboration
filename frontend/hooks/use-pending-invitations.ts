import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PendingInvitation, InvitationActionType } from "@/types/index"; // Import types

export function usePendingInvitations(onActionCallback?: () => void) {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<InvitationActionType>(null);
  
  const router = useRouter();

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/invitations/pending");
      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      } else {
        console.error("Failed to fetch pending invitations");
      }
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleAction = async (
    id: string, 
    type: "Accept" | "Decline", 
    apiPath: string
  ) => {
    setProcessingId(id);
    setActionType(type);
    
    try {
      const response = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: id }),
      });

      const data = response.ok ? await response.json() : await response.json();

      if (response.ok) {
        toast.success(`Invitation ${type.toLowerCase()}ed successfully`);
        setInvitations((prev) => prev.filter((inv) => inv.id !== id));
        
        if (onActionCallback) onActionCallback();

        if (type === "Accept") {
             if (data.projectId) router.push(`/projects/${data.projectId}`);
             else router.refresh();
        }
      } else {
        toast.error(data.message || `Failed to ${type.toLowerCase()} invitation`);
      }
    } catch (error) {
      console.error(`Error ${type.toLowerCase()}ing invitation:`, error);
      toast.error("An unexpected error occurred");
    } finally {
      setProcessingId(null);
      setActionType(null);
    }
  };

  const acceptInvitation = useCallback((id: string) => {
    handleAction(id, "Accept", "/api/invitations/accept");
  }, [handleAction, router]); // Dependency router is stable

  const declineInvitation = useCallback((id: string) => {
    handleAction(id, "Decline", "/api/invitations/decline");
  }, [handleAction]);

  return {
    invitations,
    isLoading,
    processingId,
    actionType,
    acceptInvitation,
    declineInvitation,
  };
}