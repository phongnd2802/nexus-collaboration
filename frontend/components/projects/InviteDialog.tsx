"use client";

import { Loader2, UserPlus, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useInviteDialog } from "@/hooks/useInviteDialog";
import { InviteEmailInput } from "./invite/InviteEmailInput";
import { InviteRoleSelector } from "./invite/InviteRoleSelector";

interface InviteDialogProps {
  project: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated: () => void;
}

export default function InviteDialog({
  project,
  isOpen,
  onOpenChange,
  onProjectUpdated,
}: InviteDialogProps) {
  const {
    inviteEmail,
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
  } = useInviteDialog({
    projectId: project.id,
    onOpenChange,
    onProjectUpdated,
  });

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-xs sm:max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Invite Team Members</DialogTitle>
          <DialogDescription>
            Invite team members to collaborate on this project
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite} className="space-y-4 py-4">
          {inviteError && (
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-start">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          <InviteEmailInput
            email={inviteEmail}
            onEmailChange={handleEmailSearch}
            suggestions={emailSuggestions}
            isLoading={isLoadingSuggestions}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            onSuggestionSelect={handleSuggestionSelect}
            onKeyDown={handleKeyDown}
            selectedSuggestionIndex={selectedSuggestionIndex}
            onClear={() => handleEmailSearch("")}
          />

          <InviteRoleSelector role={inviteRole} onRoleChange={setInviteRole} />

          <DialogFooter className="mt-6 flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="neutral"
              onClick={() => handleOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isInviting}
              className="w-full sm:w-auto bg-violet-700 hover:bg-violet-800 text-white"
            >
              {isInviting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
