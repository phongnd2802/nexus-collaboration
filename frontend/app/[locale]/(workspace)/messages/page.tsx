"use client";

import React, { Suspense, lazy } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslations } from "next-intl";

const MessagesLayout = lazy(
  () => import("@/components/messages/MessagesLayout")
);

export default function MessagesPage() {
  const t = useTranslations("MessagesPage");
  const isMobile = useIsMobile();

  return (
    <div className="space-y-4">
      <div>
        <h1
          className={`text-3xl font-bold tracking-tight flex items-center gap-2 ${
            isMobile ? "mt-2" : ""
          }`}
        >
          <MessageSquare className="h-7 w-7" />
          {t("title")}
        </h1>
        {!isMobile && (
          <p className="text-muted-foreground mt-1">{t("description")}</p>
        )}
      </div>
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-main" />
          </div>
        }
      >
        <MessagesLayout />
      </Suspense>
    </div>
  );
}
