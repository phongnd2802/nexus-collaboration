/**
 * Calendar day cell component
 * Displays a single day in the calendar grid with its events
 */

"use client";

import { format, isToday, isSameMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CalendarEvent } from "@/types/index";
import { getEventColor } from "./calendar-utils";
import { EventIcon } from "./event-icon";
import { EventTooltip } from "./event-tooltip";
import { useTranslations, useLocale } from "next-intl";
import { getLocaleObject } from "./calendar-utils";
interface CalendarDayCellProps {
  day: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  isMobile: boolean;
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
}

/**
 * Renders a single day cell in the calendar
 */
export function CalendarDayCell({
  day,
  selectedDate,
  events,
  isMobile,
  onDayClick,
  onEventClick,
}: CalendarDayCellProps) {
  const dayClass = cn(
    isMobile
      ? "h-10 p-0.5 relative flex flex-col items-center justify-center"
      : "h-12 sm:h-20 md:h-28 border border-border p-1 flex flex-col",
    {
      "bg-violet-50 dark:bg-violet-950/20": isToday(day),
      "text-muted-foreground": !isSameMonth(day, selectedDate),
      "bg-muted/50":
        !isToday(day) &&
        isSameMonth(day, selectedDate) &&
        day.getDay() % 6 === 0, // Weekend
      "cursor-pointer hover:bg-muted/70": true,
    }
  );

  const dateTextClass = cn("text-xs font-medium", {
    "text-foreground": isSameMonth(day, selectedDate),
    "text-violet-600 dark:text-violet-400 font-bold": isToday(day),
  });

  return (
    <div className={dayClass} onClick={() => onDayClick(day)}>
      {isMobile ? (
        <MobileDayContent
          day={day}
          events={events}
          dateTextClass={dateTextClass}
        />
      ) : (
        <DesktopDayContent
          day={day}
          events={events}
          dateTextClass={dateTextClass}
          onEventClick={onEventClick}
        />
      )}
    </div>
  );
}

/**
 * Mobile view for day content (simplified)
 */
function MobileDayContent({
  day,
  events,
  dateTextClass,
}: {
  day: Date;
  events: CalendarEvent[];
  dateTextClass: string;
}) {
  const locale = useLocale();
  const localeObject = getLocaleObject(locale);
  return (
    <>
      <span className={dateTextClass}>
        {format(day, "d", { locale: localeObject })}
      </span>
      {events.length > 0 && (
        <div className="absolute bottom-0 w-full flex justify-center">
          <div className="h-1.5 w-1.5 bg-violet-500 rounded-full mb-0.5"></div>
        </div>
      )}
    </>
  );
}

/**
 * Desktop view for day content (with event list)
 */
function DesktopDayContent({
  day,
  events,
  dateTextClass,
  onEventClick,
}: {
  day: Date;
  events: CalendarEvent[];
  dateTextClass: string;
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
}) {
  const t = useTranslations("CalendarPage.header");
  const locale = useLocale();
  const localeObject = getLocaleObject(locale);

  return (
    <>
      <div className="flex justify-between">
        <span className={dateTextClass}>
          {format(day, "d", { locale: localeObject })}
        </span>
        {isToday(day) && (
          <Badge className="bg-violet-500 hover:bg-violet-600 h-4 px-1">
            {t("today")}
          </Badge>
        )}
      </div>
      <div className="mt-1 overflow-y-auto space-y-1 max-h-20">
        {events.map((event, eventIndex) => (
          <EventTooltip key={eventIndex} event={event}>
            <div
              className={cn(
                "rounded px-1 py-0.5 text-xs truncate flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity",
                getEventColor(event)
              )}
              onClick={e => {
                e.stopPropagation();
                onEventClick(event, e);
              }}
            >
              <EventIcon event={event} />
              {event.title}
            </div>
          </EventTooltip>
        ))}
      </div>
    </>
  );
}
