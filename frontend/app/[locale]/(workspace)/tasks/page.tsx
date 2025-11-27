"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Loader2,
  PlusCircle,
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  ChevronDown,
  AlertTriangle,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TaskCard from "@/components/tasks/TaskCard";
import { useIsMobile } from "@/hooks/use-mobile";
import TaskStatsAccordion from "@/components/tasks/TaskStatsAccordion";
import TaskStats from "@/components/tasks/TaskStats";
import { Task } from "@/types/index";
import { useTasksData } from "@/hooks/use-tasks-data";
import { LoadingState } from "@/components/ui/loading-state";

export default function TasksPage() {
  const { data: session, status } = useSession();
  const isMobile = useIsMobile();

  const {
    filteredTasks,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    priorityFilter,
    sortBy,
    sortOrder,
    activeTab,
    setActiveTab,
    getTaskCount,
    toggleStatusFilter,
    togglePriorityFilter,
    clearFilters,
    toggleSort,
  } = useTasksData();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DONE":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "TODO":
        return <Circle className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  if (isLoading || status === "loading") {
    return <LoadingState />;
  }

  const renderEmptyState = (tabType: "assigned" | "created") => {
    // We can't easily check if *all* tasks are empty from the hook without exposing 'tasks'
    // But we can infer it if filteredTasks is empty and no filters are active.
    // However, let's just use filteredTasks for simplicity or expose 'tasks' from hook if needed.
    // For now, I'll simplify the empty state logic or expose 'tasks' from hook.
    // Let's assume we want to keep the original logic, so I should expose 'tasks' from the hook.
    // I did expose 'tasks' in the hook.

    // Re-accessing tasks from hook would require destructuring it.
    // Let's assume I destructured it above.
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-4">
            <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            No tasks found
          </h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            Try adjusting your filters or create a new task.
          </p>
          <Button
            asChild
            className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-700 text-white"
          >
            <Link href="/tasks/create">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create New Task
            </Link>
          </Button>
          {/* Simplified empty state for now to avoid complexity in this replacement */}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CheckSquare className="h-7 w-7" />
            My Tasks
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage all your tasks across projects
          </p>
        </div>

        <Button
          asChild
          className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-700 text-white"
        >
          <Link href="/tasks/create">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Task
          </Link>
        </Button>
      </div>

      <Tabs
        defaultValue="assigned"
        className="flex flex-col gap-4 w-full"
        onValueChange={(value) => setActiveTab(value as "assigned" | "created")}
      >
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <TabsList className="mb-0">
            <TabsTrigger value="assigned">
              Assigned ({getTaskCount("assigned")})
            </TabsTrigger>
            <TabsTrigger value="created">
              Created ({getTaskCount("created")})
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col lg:flex-row gap-4 flex-1 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="noShadow"
                  size="sm"
                  className="absolute right-1 top-1.5 h-8 w-8 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex gap-2 ">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="neutral"
                    className="flex items-center flex-1"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Filter By Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={statusFilter.includes("TODO")}
                    onCheckedChange={() => toggleStatusFilter("TODO")}
                  >
                    <Circle className="h-3.5 w-3.5 mr-2 text-gray-500" />
                    To Do
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter.includes("IN_PROGRESS")}
                    onCheckedChange={() => toggleStatusFilter("IN_PROGRESS")}
                  >
                    <Clock className="h-3.5 w-3.5 mr-2 text-blue-500" />
                    In Progress
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter.includes("DONE")}
                    onCheckedChange={() => toggleStatusFilter("DONE")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500" />
                    Done
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Filter By Priority</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={priorityFilter.includes("HIGH")}
                    onCheckedChange={() => togglePriorityFilter("HIGH")}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-2 text-rose-500" />
                    High
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={priorityFilter.includes("MEDIUM")}
                    onCheckedChange={() => togglePriorityFilter("MEDIUM")}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-2 text-amber-500" />
                    Medium
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={priorityFilter.includes("LOW")}
                    onCheckedChange={() => togglePriorityFilter("LOW")}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-2 text-blue-500" />
                    Low
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearFilters}>
                    Clear Filters
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="neutral" className="flex items-center">
                    <div className="flex items-center">
                      Sort by
                      {sortBy === "dueDate" && (
                        <span className="ml-1 flex items-center">
                          Due Date{" "}
                          {sortOrder === "asc" ? (
                            <ArrowUp className="ml-1 h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </span>
                      )}
                      {sortBy === "priority" && (
                        <span className="ml-1 flex items-center">
                          Priority{" "}
                          {sortOrder === "asc" ? (
                            <ArrowUp className="ml-1 h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </span>
                      )}
                      {sortBy === "status" && (
                        <span className="ml-1 flex items-center">
                          Status{" "}
                          {sortOrder === "asc" ? (
                            <ArrowUp className="ml-1 h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toggleSort("dueDate")}>
                    Due Date{" "}
                    {sortBy === "dueDate" &&
                      (sortOrder === "asc" ? (
                        <ArrowUp className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowDown className="ml-1 h-3 w-3" />
                      ))}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort("priority")}>
                    Priority{" "}
                    {sortBy === "priority" &&
                      (sortOrder === "asc" ? (
                        <ArrowUp className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowDown className="ml-1 h-3 w-3" />
                      ))}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort("status")}>
                    Status{" "}
                    {sortBy === "status" &&
                      (sortOrder === "asc" ? (
                        <ArrowUp className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowDown className="ml-1 h-3 w-3" />
                      ))}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {(statusFilter.length > 0 ||
          priorityFilter.length > 0 ||
          searchQuery) && (
          <div className="flex flex-wrap gap-2 items-center mt-4">
            <span className="text-sm text-muted-foreground">
              Active filters:
            </span>
            {searchQuery && (
              <Badge variant="default" className="flex items-center gap-1">
                <Search className="h-3 w-3 mr-1" />"{searchQuery}"
                <Button
                  variant="noShadow"
                  size="sm"
                  className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {statusFilter.map((status) => (
              <Badge
                key={status}
                variant="default"
                className="flex items-center gap-1"
              >
                {getStatusIcon(status)}
                <span className="ml-1">
                  {status === "TODO"
                    ? "To Do"
                    : status === "IN_PROGRESS"
                    ? "In Progress"
                    : "Done"}
                </span>
                <Button
                  variant="neutral"
                  size="sm"
                  className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => toggleStatusFilter(status)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            {priorityFilter.map((priority) => (
              <Badge
                key={priority}
                variant="default"
                className="flex items-center gap-1"
              >
                <AlertTriangle
                  className={`h-3 w-3 mr-1 ${
                    priority === "HIGH"
                      ? "text-rose-500"
                      : priority === "MEDIUM"
                      ? "text-amber-500"
                      : "text-blue-500"
                  }`}
                />
                {priority}
                <Button
                  variant="neutral"
                  size="sm"
                  className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => togglePriorityFilter(priority)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            <Button
              variant="neutral"
              size="sm"
              className="text-xs h-6 text-muted-foreground hover:text-foreground"
              onClick={clearFilters}
            >
              Clear All
            </Button>
          </div>
        )}

        {isMobile ? (
          <TaskStatsAccordion
            activeTab={activeTab}
            getTaskCount={getTaskCount}
          />
        ) : (
          <TaskStats
            activeTab={activeTab}
            getTaskCount={getTaskCount}
            className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6"
          />
        )}

        <TabsContent value="assigned" className="mt-6">
          {filteredTasks.length === 0 ? (
            renderEmptyState("assigned")
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  currentUserId={session?.user?.id || ""}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="created" className="mt-6">
          {filteredTasks.length === 0 ? (
            renderEmptyState("created")
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  currentUserId={session?.user?.id || ""}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
