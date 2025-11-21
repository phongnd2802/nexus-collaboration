import React, { useMemo } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

export const CalendarView = () => {
  const days = useMemo(() => ["S", "M", "T", "W", "T", "F", "S"], []);
  const dates = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    const date = i + 11;
    return {
      key: i,
      display: date > 31 ? date - 31 : date,
      isToday: date === 22,
      hasEvent: [15, 18, 22, 25].includes(date),
    };
  }), []);

  return (
    <div className="h-40 rounded-lg bg-violet-50 dark:bg-violet-900/20 p-3 overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-foreground flex items-center">
          <CalendarIcon className="h-3 w-3 mr-1" /> Calendar View
        </h3>
        <span className="text-xs text-violet-700 dark:text-violet-400">May 2025</span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-xs">
        {days.map((d, i) => (
          <div key={i} className="text-center font-medium text-muted-foreground py-1 text-xs">{d}</div>
        ))}
        {dates.map((item) => (
          <div
            key={item.key}
            className={`text-center py-1 px-0.5 rounded text-xs h-6 flex items-center justify-center ${
              item.isToday
                ? "bg-violet-700 text-white"
                : item.hasEvent
                ? "bg-violet-200 dark:bg-violet-800 text-violet-900 dark:text-violet-300"
                : "text-foreground hover:bg-violet-100 dark:hover:bg-violet-800"
            }`}
          >
            {item.display}
          </div>
        ))}
      </div>
    </div>
  );
};