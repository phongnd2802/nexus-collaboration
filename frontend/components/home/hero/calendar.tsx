import React, { useMemo } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export const CalendarView = () => {
  const t = useTranslations("HomePage.hero.preview.calendar");
  const days = useMemo(() => t("weekdays").split(","), [t]);
  const dates = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => {
        const date = i + 11;
        return {
          key: i,
          display: date > 31 ? date - 31 : date,
          isToday: date === 22,
          hasEvent: [15, 18, 22, 25].includes(date),
        };
      }),
    []
  );

  return (
    <div
      className="
        h-40 rounded-lg bg-card/80 dark:bg-card/70 p-3 overflow-hidden
        border border-white/10 dark:border-white/5
        shadow-[0_4px_10px_rgba(0,0,0,0.08),0_10px_25px_rgba(0,0,0,0.06)]
        backdrop-blur-xl
      "
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-foreground flex items-center">
          <CalendarIcon className="h-3 w-3 mr-1 text-main" /> {t("title")}
        </h3>
        <span className="text-xs text-muted-foreground">{t("date")}</span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5 text-xs">
        {/* Weekday labels */}
        {days.map((d, i) => (
          <div
            key={i}
            className="text-center font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}

        {/* Dates */}
        {dates.map(item => {
          const baseClasses =
            "text-center py-1 px-0.5 rounded text-xs h-6 flex items-center justify-center transition-all duration-150";
          let extraClasses = "";

          if (item.isToday) {
            extraClasses =
              "bg-main text-main-foreground font-semibold shadow-sm border border-main/40";
          } else if (item.hasEvent) {
            extraClasses =
              "bg-main/20 dark:bg-main/30 text-main/80 dark:text-main/40 border border-main/20 dark:border-main/30";
          } else {
            extraClasses =
              "text-foreground hover:bg-main/10 dark:hover:bg-main/20 border border-transparent hover:border-main/20 dark:hover:border-main/30";
          }

          return (
            <div key={item.key} className={`${baseClasses} ${extraClasses}`}>
              {item.display}
            </div>
          );
        })}
      </div>
    </div>
  );
};
