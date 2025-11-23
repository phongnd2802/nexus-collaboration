import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Task } from "@/types/index";
import { TaskCard } from "./TaskCard";
import { CheckCircle2, Clock, Circle } from "lucide-react";

interface TaskColumnProps {
  title: string;
  status: string;
  tasks: Task[];
  icon: React.ReactNode;
  bgColor: string;
  borderColor?: string; // Used in mobile but maybe useful here too
  hoverColumn: string | null;
  isAdmin: boolean;
  isEditor?: boolean;
  isMobile: boolean;
  onDragOver: (e: React.DragEvent, columnId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onDragStart: (taskId: string) => void;
}

export const TaskColumn = React.forwardRef<HTMLDivElement, TaskColumnProps>(
  (
    {
      title,
      status,
      tasks,
      icon,
      bgColor,
      hoverColumn,
      isAdmin,
      isEditor,
      isMobile,
      onDragOver,
      onDragLeave,
      onDrop,
      onDragStart,
    },
    ref
  ) => {
    const getColumnBackground = () => {
      if (hoverColumn === status) {
        switch (status) {
          case "TODO":
            return "bg-gray-100 dark:bg-gray-800";
          case "IN_PROGRESS":
            return "bg-blue-50 dark:bg-blue-900/20";
          case "DONE":
            return "bg-green-50 dark:bg-green-900/20";
        }
      }
      return "bg-card";
    };

    // Helper to get status icon for the card (if we want to pass it down or render it here)
    // For now TaskCard doesn't render it, matching my previous file.
    // If we want to match the original EXACTLY, we should add the icon to TaskCard.
    // But the column header has the icon, so it's clear.
    // Original code:
    /*
      const getStatusIcon = (status: string) => {
        switch (status) {
          case "DONE": return <CheckCircle2 ... />;
          case "IN_PROGRESS": return <Clock ... />;
          case "TODO": return <Circle ... />;
        }
      };
    */
    // I'll add the icon to the card in a future iteration if needed, but for now let's stick to the plan.
    // Actually, let's pass the status icon to the card if we really want it.
    // But wait, I didn't add it to TaskCard props. I'll leave it for now.

    return (
      <Card
        ref={ref}
        className={cn(
          "transition-all",
          getColumnBackground(),
          "rounded-xl border shadow-sm flex flex-col max-h-[60vh] md:max-h-[calc(100vh-280px)] overflow-y-auto"
        )}
        onDragOver={(e) => onDragOver(e, status)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, status)}
      >
        <CardHeader className="sticky top-0 z-10 bg-card dark:bg-background">
          <CardTitle className="text-base flex items-center justify-between p-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-muted">
                {icon}
              </div>
              {title}
            </div>
            <Badge variant="outline">{tasks.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              statusColor={bgColor}
              isAdmin={isAdmin}
              isEditor={isEditor}
              isMobile={isMobile}
              onDragStart={onDragStart}
            />
          ))}
        </CardContent>
      </Card>
    );
  }
);

TaskColumn.displayName = "TaskColumn";
