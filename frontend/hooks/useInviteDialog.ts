import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { User } from "@/types/index";

interface UseInviteDialogProps {
  projectId: string;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated: () => void;
}

export function useInviteDialog({
  projectId,
  onOpenChange,
  onProjectUpdated,
}: UseInviteDialogProps) {
  const [inviteError, setInviteError] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState<User[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");

  const resetForm = useCallback(() => {
    setInviteEmail("");
    setInviteRole("MEMBER");
    setEmailSuggestions([]);
    setShowSuggestions(false);
    setInviteError("");
    setSelectedSuggestionIndex(-1);
  }, []);

  const handleEmailSearch = useCallback(async (query: string) => {
    setInviteEmail(query);
    setSelectedSuggestionIndex(-1);

    if (query.length < 2) {
      setEmailSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(
        `/api/collaborators?search=${encodeURIComponent(query)}`
      );

      if (response.ok) {
        const data = await response.json();
        const suggestions = data.collaborators || [];
        setEmailSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } else {
        console.error("Failed to search users");
        setEmailSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setEmailSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const handleSuggestionSelect = useCallback((user: User) => {
    setInviteEmail(user.email || "");
    setShowSuggestions(false);
    setEmailSuggestions([]);
    setSelectedSuggestionIndex(-1);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || emailSuggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev < emailSuggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedSuggestionIndex >= 0) {
            handleSuggestionSelect(emailSuggestions[selectedSuggestionIndex]);
          }
          break;
        case "Escape":
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
          break;
      }
    },
    [showSuggestions, emailSuggestions, selectedSuggestionIndex, handleSuggestionSelect]
  );

  const handleInvite = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setIsInviting(true);
    setInviteError("");

    if (!inviteEmail) {
      setInviteError("Email address is required");
      setIsInviting(false);
      return;
    }

    if (!inviteRole) {
      setInviteError("Role is required");
      setIsInviting(false);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setInviteError(data.message || "Failed to send invitation");
        setIsInviting(false);
        return;
      }

      toast.success("Invitation sent successfully");
      onOpenChange(false);
      resetForm();
      onProjectUpdated();
    } catch (error) {
      console.error("Error sending invitation:", error);
      setInviteError("An unexpected error occurred");
    } finally {
      setIsInviting(false);
    }
  }, [inviteEmail, inviteRole, projectId, onOpenChange, onProjectUpdated, resetForm]);

  return {
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    inviteError,
    isInviting,
    emailSuggestions,
    isLoadingSuggestions,
    showSuggestions,
    setShowSuggestions,
    selectedSuggestionIndex,
    handleEmailSearch,
    handleSuggestionSelect,
    handleKeyDown,
    handleInvite,
    resetForm,
  };
}
