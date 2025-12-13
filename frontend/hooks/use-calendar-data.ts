import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { CalendarEvent, Deadline } from "@/types/index";

export function useCalendarData(selectedDate: Date) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<{
    calendar: CalendarEvent[];
  } | null>(null);
  const [deadlinesData, setDeadlinesData] = useState<Deadline[]>([]);

  const fetchCalendarData = useCallback(async () => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    try {
      // Calculate date range
      const start = format(startOfMonth(selectedDate), "yyyy-MM-dd");
      const end = format(endOfMonth(selectedDate), "yyyy-MM-dd");

      // Fetch calendar events
      const response = await fetch(
        `/api/calendar/events?startDate=${start}&endDate=${end}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch calendar data");
      }

      const data = await response.json();
      setCalendarData(data);

      // Fetch deadlines
      const deadlinesResponse = await fetch(`/api/calendar/deadlines`);
      if (deadlinesResponse.ok) {
        const deadlinesData = await deadlinesResponse.json();
        setDeadlinesData(deadlinesData);
      }
    } catch (error) {
      console.error("Error fetching calendar data:", error);
      toast.error("Failed to load calendar data");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, selectedDate]);

  const fetchDeadlines = useCallback(async (timeFrame?: string) => {
    try {
      const url = timeFrame 
        ? `/api/calendar/deadlines?days=${timeFrame}`
        : `/api/calendar/deadlines`;
        
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch deadlines");
      }
      const data = await response.json();
      setDeadlinesData(data);
    } catch (error) {
      console.error("Error fetching deadlines:", error);
      toast.error("Failed to load deadlines");
    }
  }, []);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  return {
    calendarData,
    deadlinesData,
    isLoading,
    fetchCalendarData,
    fetchDeadlines,
  };
}
