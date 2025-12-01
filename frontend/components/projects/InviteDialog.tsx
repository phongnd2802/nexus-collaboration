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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("inviteDialog");
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
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
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

          <DialogFooter className="mt-6 flex sm:flex-row gap-3">
            <Button
              type="button"
              variant="neutral"
              onClick={() => handleOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isInviting}
            >
              {isInviting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("sending")}
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t("invite")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
