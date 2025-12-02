"use client";

import type React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PasswordForm } from "./password-form";
import { AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface SecuritySettingsProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  setCurrentPassword: (value: string) => void;
  setNewPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  handlePasswordUpdate: (e: React.FormEvent) => Promise<void>;
  isUpdatingPassword: boolean;
  passwordError: string;
  passwordSuccess: string;
}

export function SecuritySettings({
  currentPassword,
  newPassword,
  confirmPassword,
  setCurrentPassword,
  setNewPassword,
  setConfirmPassword,
  handlePasswordUpdate,
  isUpdatingPassword,
  passwordError,
  passwordSuccess,
}: SecuritySettingsProps) {
  const t = useTranslations("ProfilePage.security");
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
              {t("changePassword")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("changePasswordDesc")}
            </p>

            {passwordError && (
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-red-600 dark:text-red-400 text-sm mt-2">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-green-600 dark:text-green-400 text-sm mt-2">
                <CheckCircle className="h-4 w-4 inline mr-2" />
                {passwordSuccess}
              </div>
            )}

            <PasswordForm
              currentPassword={currentPassword}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              setCurrentPassword={setCurrentPassword}
              setNewPassword={setNewPassword}
              setConfirmPassword={setConfirmPassword}
              handlePasswordUpdate={handlePasswordUpdate}
              isUpdatingPassword={isUpdatingPassword}
            />
          </div>
          <Separator className="my-6 bg-border" />

          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground">
              {t("twoFactorTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("twoFactorDesc")}
            </p>
            <Button
              variant="default"
              className="mt-4 border-border hover:bg-muted text-foreground"
              onClick={() => {
                toast.success(t("twoFactorComingSoon"));
              }}
            >
              {t("enableTwoFactor")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
