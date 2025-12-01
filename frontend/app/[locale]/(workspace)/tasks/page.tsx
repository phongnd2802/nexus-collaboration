"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
import { useTasksData } from "@/hooks/use-tasks-data";
import { LoadingState } from "@/components/ui/loading-state";

export default function TasksPage() {
  const { data: session, status } = useSession();
  const isMobile = useIsMobile();
  const t = useTranslations("TasksPage");

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
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-4">
            <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t("emptyState.title")}
          </h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            {t("emptyState.description")}
          </p>
          <Button
            variant="default"
          >
            <Link href="/tasks/create">
              <PlusCircle className="h-4 w-4 mr-2" />
              {t("emptyState.createTask")}
            </Link>
          </Button>
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
            {t("header.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("header.subtitle")}</p>
        </div>

        <Button
          asChild
          variant="default"
        >
          <Link href="/tasks/create">
            <PlusCircle className="h-4 w-4 mr-2" />
            {t("header.newTask")}
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
              {t("tabs.assigned")} ({getTaskCount("assigned")})
            </TabsTrigger>
            <TabsTrigger value="created">
              {t("tabs.created")} ({getTaskCount("created")})
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col lg:flex-row gap-4 flex-1 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search.placeholder")}
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
                    {t("filter.button")}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{t("filter.byStatus")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={statusFilter.includes("TODO")}
                    onCheckedChange={() => toggleStatusFilter("TODO")}
                  >
                    <Circle className="h-3.5 w-3.5 mr-2 text-gray-500" />
                    {t("status.TODO")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter.includes("IN_PROGRESS")}
                    onCheckedChange={() => toggleStatusFilter("IN_PROGRESS")}
                  >
                    <Clock className="h-3.5 w-3.5 mr-2 text-blue-500" />
                    {t("status.IN_PROGRESS")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusFilter.includes("DONE")}
                    onCheckedChange={() => toggleStatusFilter("DONE")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500" />
                    {t("status.DONE")}
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>
                    {t("filter.byPriority")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={priorityFilter.includes("HIGH")}
                    onCheckedChange={() => togglePriorityFilter("HIGH")}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-2 text-rose-500" />
                    {t("priority.HIGH")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={priorityFilter.includes("MEDIUM")}
                    onCheckedChange={() => togglePriorityFilter("MEDIUM")}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-2 text-amber-500" />
                    {t("priority.MEDIUM")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={priorityFilter.includes("LOW")}
                    onCheckedChange={() => togglePriorityFilter("LOW")}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-2 text-blue-500" />
                    {t("priority.LOW")}
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearFilters}>
                    {t("filter.clearFilters")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="neutral" className="flex items-center">
                    <div className="flex items-center">
                      {t("sort.button")}
                      {sortBy === "dueDate" && (
                        <span className="ml-1 flex items-center">
                          {t("sort.dueDate")}{" "}
                          {sortOrder === "asc" ? (
                            <ArrowUp className="ml-1 h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </span>
                      )}
                      {sortBy === "priority" && (
                        <span className="ml-1 flex items-center">
                          {t("sort.priority")}{" "}
                          {sortOrder === "asc" ? (
                            <ArrowUp className="ml-1 h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </span>
                      )}
                      {sortBy === "status" && (
                        <span className="ml-1 flex items-center">
                          {t("sort.status")}{" "}
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
                    {t("sort.dueDate")}{" "}
                    {sortBy === "dueDate" &&
                      (sortOrder === "asc" ? (
                        <ArrowUp className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowDown className="ml-1 h-3 w-3" />
                      ))}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort("priority")}>
                    {t("sort.priority")}{" "}
                    {sortBy === "priority" &&
                      (sortOrder === "asc" ? (
                        <ArrowUp className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowDown className="ml-1 h-3 w-3" />
                      ))}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort("status")}>
                    {t("sort.status")}{" "}
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
              {t("filter.activeFilters")}
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
                    ? t("status.TODO")
                    : status === "IN_PROGRESS"
                    ? t("status.IN_PROGRESS")
                    : t("status.DONE")}
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
              {t("filter.clearAll")}
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
