import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskCard } from "./TaskCard";
import { Task } from "@/types/index";

interface ColumnConfig {
  title: string;
  status: string;
  tasks: Task[];
  icon: React.ReactNode;
  emptyIcon: React.ReactNode;
  bgColor: string;
  borderColor: string;
}

interface MobileTaskViewProps {
  columns: ColumnConfig[];
  mobileColumnIndex: number;
  setMobileColumnIndex: (index: number) => void;
  handlePrevColumn: () => void;
  handleNextColumn: (totalColumns: number) => void;
  isAdmin: boolean;
  isEditor?: boolean;
}

export const MobileTaskView = ({
  columns,
  mobileColumnIndex,
  setMobileColumnIndex,
  handlePrevColumn,
  handleNextColumn,
  isAdmin,
  isEditor,
}: MobileTaskViewProps) => {
  const currentColumn = columns[mobileColumnIndex];

  return (
    <div className="px-1 space-y-3">
      <div className="flex justify-center items-center gap-1.5 mb-2">
        {columns.map((column, i) => (
          <div
            key={column.status}
            className={cn(
              "h-2 rounded-full transition-all",
              mobileColumnIndex === i
                ? "w-8 bg-primary"
                : "w-2 bg-muted cursor-pointer"
            )}
            onClick={() => setMobileColumnIndex(i)}
          />
        ))}
      </div>

      {/* Column Header */}
      <div className="flex justify-between items-center">
        <Button
          variant="neutral"
          size="sm"
          className="p-1.5"
          disabled={mobileColumnIndex === 0}
          onClick={handlePrevColumn}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center",
              currentColumn.status === "TODO"
                ? "bg-gray-200 dark:bg-gray-700"
                : currentColumn.status === "IN_PROGRESS"
                ? "bg-blue-100 dark:bg-blue-900/50"
                : "bg-green-100 dark:bg-green-900/50"
            )}
          >
            {currentColumn.icon}
          </div>
          <h3 className="text-base font-medium">
            {currentColumn.title}
            <Badge className="ml-2" variant="default">
              {currentColumn.tasks.length}
            </Badge>
          </h3>
        </div>

        <Button
          variant="neutral"
          size="sm"
          className="p-1.5"
          disabled={mobileColumnIndex === columns.length - 1}
          onClick={() => handleNextColumn(columns.length)}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Task Content */}
      <Card
        className={cn(
          "overflow-hidden border rounded-xl transition-all",
          currentColumn.borderColor,
          currentColumn.bgColor
        )}
      >
        <CardContent className="p-3 space-y-2">
          {currentColumn.tasks.length > 0 ? (
            <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
              {currentColumn.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  statusColor={currentColumn.bgColor}
                  isAdmin={isAdmin}
                  isEditor={isEditor}
                  isMobile={true}
                  onDragStart={() => {}}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mb-3",
                  currentColumn.status === "TODO"
                    ? "bg-gray-100 dark:bg-gray-800"
                    : currentColumn.status === "IN_PROGRESS"
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "bg-green-50 dark:bg-green-900/20"
                )}
              >
                {currentColumn.emptyIcon}
              </div>
              <p className="text-sm text-muted-foreground">
                No {currentColumn.title.toLowerCase()} tasks
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Swipe Indicator */}
      <div className="text-center text-xs text-muted-foreground mt-1">
        Swipe or tap dots to change views
      </div>
    </div>
  );
};
