"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { addMonths, subMonths } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Loader2 } from "lucide-react";
import CalendarView from "@/components/calendar/calendar-view";
import DeadlinesList from "@/components/calendar/deadlines-list";
import { useSearchParams } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";

import { useCalendarData } from "@/hooks/use-calendar-data";
import { CalendarPageHeader } from "@/components/calendar/calendar-page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { useTranslations } from "next-intl";

function CalendarPage() {
  const t = useTranslations("CalendarPage");
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [isInitialRender, setIsInitialRender] = useState(true);

  const defaultTab =
    searchParams?.get("tab") === "deadlines" ? "deadlines" : "calendar";
  const [selectedView, setSelectedView] = useState<"calendar" | "deadlines">(
    defaultTab
  );
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { calendarData, deadlinesData, isLoading, fetchDeadlines } =
    useCalendarData(selectedDate);

  useEffect(() => {
    setIsInitialRender(false);
  }, []);

  const handlePreviousMonth = () => {
    setSelectedDate((prevDate) => subMonths(prevDate, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate((prevDate) => addMonths(prevDate, 1));
  };

  if (status === "loading") {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-main" />
      </div>
    );
  }

  const onDeadlineTimeFrameChange = (newTimeFrame: string) => {
    fetchDeadlines(newTimeFrame);
  };

  if (isLoading && isInitialRender) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-main" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-8">
      <CalendarPageHeader
        isMobile={isMobile}
        selectedView={selectedView}
        selectedDate={selectedDate}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        onToday={() => setSelectedDate(new Date())}
        isLoading={isLoading}
      />

      <Tabs
        defaultValue="calendar"
        value={selectedView}
        onValueChange={(value) => setSelectedView(value as any)}
        className="w-full"
      >
        <TabsList className={isMobile ? "w-full mb-3" : "mb-4"}>
          <TabsTrigger
            value="calendar"
            className={isMobile ? "flex-1" : "min-w-[110px] md:min-w-[130px]"}
            disabled={isLoading}
          >
            {t("calendar")}
          </TabsTrigger>
          <TabsTrigger
            value="deadlines"
            className={isMobile ? "flex-1" : "min-w-[110px] md:min-w-[130px]"}
            disabled={isLoading}
          >
            Deadlines
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          {isLoading ? (
            <Skeleton className="w-full h-[500px] rounded-lg" />
          ) : calendarData ? (
            <CalendarView
              events={calendarData.calendar || []}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          ) : (
            <Card>
              <CardContent className="p-6 flex justify-center">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground opacity-50 mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    {t("noCalendarData")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="deadlines" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="w-full h-12 rounded-lg" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="w-full h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <DeadlinesList
              deadlines={deadlinesData}
              onTimeFrameChange={onDeadlineTimeFrameChange}
            />
          )}
        </TabsContent>
      </Tabs>

      {isLoading && !isInitialRender && (
        <div className="fixed bottom-4 right-4 bg-background shadow-lg rounded-full p-2 z-50 border">
          <Loader2 className="h-6 w-6 animate-spin text-main" />
        </div>
      )}
    </div>
  );
}

// Suspense boundary
export default function CalendarPageSuspense() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CalendarPage />
    </Suspense>
  );
}
