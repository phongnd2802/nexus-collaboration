"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface AccountActionsProps {
  hasPasswordAuth: boolean;
}

export function AccountActions({
  hasPasswordAuth = false,
}: AccountActionsProps) {
  const t = useTranslations("ProfilePage.accountActions");
  const getSavedDialogState = () => {
    if (typeof window !== "undefined") {
      const savedState = sessionStorage.getItem("deleteDialogOpen");
      return savedState === "true";
    }
    return false;
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(
    getSavedDialogState()
  );

  const handleDeleteModalChange = (isOpen: boolean) => {
    setIsDeleteModalOpen(isOpen);

    if (typeof window !== "undefined") {
      if (isOpen) {
        sessionStorage.setItem("deleteDialogOpen", "true");
      } else {
        sessionStorage.removeItem("deleteDialogOpen");
        clearDeleteAccountStorage();
      }
    }
  };

  const clearDeleteAccountStorage = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("deleteDialogOpen");
      sessionStorage.removeItem("deleteAccountState");
      localStorage.removeItem("deleteDialogOpen");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground">
              {t("exportTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("exportDescription")}
            </p>
            <Button
              variant="neutral"
              className="mt-4 border-border hover:bg-muted text-foreground"
              onClick={() => {
                toast.success(t("exportComingSoon"));
              }}
            >
              {t("exportButton")}
            </Button>
          </div>

          <Separator className="bg-border" />

          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground">
              {t("deleteTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("deleteDescription")}
            </p>
            <Button
              variant="neutral"
              className="mt-4 text-red-600 dark:text-red-500 border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-800/50 transition-all"
              onClick={() => handleDeleteModalChange(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("deleteButton")}
            </Button>

            <DeleteAccountDialog
              isOpen={isDeleteModalOpen}
              onOpenChange={handleDeleteModalChange}
              hasPasswordAuth={hasPasswordAuth}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
