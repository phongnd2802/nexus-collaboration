import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useTranslations, useLocale } from "next-intl";
import { getLocaleObject } from "./calendar-utils";

interface CalendarPageHeaderProps {
  isMobile: boolean;
  selectedView: "calendar" | "deadlines";
  selectedDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  isLoading?: boolean;
}

export function CalendarPageHeader({
  isMobile,
  selectedView,
  selectedDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
  isLoading = false,
}: CalendarPageHeaderProps) {
  const t = useTranslations("CalendarPage.header");
  const locale = useLocale();
  const localeObject = getLocaleObject(locale);

  const formattedDate = format(
    selectedDate,
    isMobile ? "MMM yyyy" : "MMMM yyyy",
    {
      locale: localeObject,
    }
  );

  const capitalizedDate =
    formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* Title */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <Calendar className="h-6 w-6 md:h-7 md:w-7" />
          {t("title")}
        </h1>

        {!isMobile && (
          <p className="mt-1 text-muted-foreground">{t("description")}</p>
        )}
      </div>

      {/* Calendar Controls */}
      {selectedView === "calendar" && (
        <div className="flex items-center gap-2 md:gap-4">
          {/* Month Switch Control */}
          <div
            className="
              flex items-center gap-1
              rounded-xl bg-card
              px-2 py-1
            "
          >
            {/* Previous */}
            <Button
              variant="neutral"
              size={isMobile ? "sm" : "icon"}
              onClick={onPreviousMonth}
              disabled={isLoading}
              className="text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>

            {/* Month Text (fixed size) */}
            <span
              className="
                min-w-[120px] md:min-w-[160px]
                text-center font-medium
                text-sm md:text-base
              "
            >
              {capitalizedDate}
            </span>

            {/* Next */}
            <Button
              variant="neutral"
              size={isMobile ? "sm" : "icon"}
              onClick={onNextMonth}
              disabled={isLoading}
              className="text-muted-foreground"
            >
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>

          {/* Today Button */}
          <Button
            variant="neutral"
            size={isMobile ? "sm" : "default"}
            disabled={isLoading}
            onClick={onToday}
          >
            {t("today")}
          </Button>
        </div>
      )}
    </div>
  );
}
