"use client";

import { cn } from "@/lib/utils";

import { useTranslations } from "next-intl";
import { useMemo } from "react";

interface CalendarHeaderProps {
  isMobile: boolean;
}

export function CalendarHeader({ isMobile }: CalendarHeaderProps) {
  const t = useTranslations("CalendarPage.weekdays");
  const weekDays = useMemo(() => {
    return isMobile
      ? t("short").split(",")
      : t("full").split(",");
  }, [isMobile, t]);

  return (
    <div className="grid grid-cols-7 border-b border-border">
      {weekDays.map((day, i) => (
        <div
          key={i}
          className={cn(
            "py-2 text-center font-medium text-muted-foreground",
            isMobile ? "text-xs" : "text-sm"
          )}
        >
          {day}
        </div>
      ))}
    </div>
  );
}
