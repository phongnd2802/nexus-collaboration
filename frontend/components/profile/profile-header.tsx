"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface ProfileHeaderProps {
  isSaving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
}

export function ProfileHeader({ isSaving, onSave }: ProfileHeaderProps) {
  const t = useTranslations("ProfilePage.header");
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("description")}</p>
        </div>
        <Button
          onClick={onSave}
          className="!bg-blue-500 hover:!bg-blue-600 text-black"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("saving")}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {t("saveButton")}
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
