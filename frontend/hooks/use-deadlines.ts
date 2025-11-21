import { useMemo, useState, useCallback } from "react";
import { Deadline } from "@/types/index";
import {
  filterDeadlinesByType,
  sortDeadlinesByDate,
  groupDeadlinesByDate,
} from "@/lib/deadline-utils";

interface UseDeadlinesOptions {
  deadlines: Deadline[];
  initialFilter?: string;
  initialTimeframe?: string;
}

/**
 * Custom hook to manage deadline filtering, sorting, and grouping logic.
 * Handles state management and memoization for performance.
 */
export function useDeadlines({
  deadlines,
  initialFilter = "all",
  initialTimeframe = "7",
}: UseDeadlinesOptions) {
  const [filter, setFilter] = useState(initialFilter);
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // Memoized filtered and sorted deadlines
  const filteredDeadlines = useMemo(() => {
    const filtered = filterDeadlinesByType(deadlines, filter);
    return sortDeadlinesByDate(filtered);
  }, [deadlines, filter]);

  // Memoized grouped deadlines
  const groupedDeadlines = useMemo(() => {
    return groupDeadlinesByDate(filteredDeadlines);
  }, [filteredDeadlines]);

  // Toggle section open/closed state
  const toggleSection = useCallback((dateStr: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  }, []);

  return {
    filter,
    setFilter,
    timeframe,
    setTimeframe,
    filteredDeadlines,
    groupedDeadlines,
    openSections,
    toggleSection,
  };
}
