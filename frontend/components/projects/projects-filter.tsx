import {
  Search,
  Filter,
  ChevronDown,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslations } from "next-intl";

interface ProjectsFilterProps {
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string[];
  toggleStatusFilter: (status: string) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  toggleSort: (field: string) => void;
  clearFilters: () => void;
}

export function ProjectsFilter({
  isLoading,
  searchQuery,
  setSearchQuery,
  statusFilter,
  toggleStatusFilter,
  sortBy,
  sortOrder,
  toggleSort,
  clearFilters,
}: ProjectsFilterProps) {
  const t = useTranslations("ProjectsPage.filter");
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("placeholder")}
            className="pl-9 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
          />
          {searchQuery && (
            <Button
              variant="neutral"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => setSearchQuery("")}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {isLoading ? (
            <Skeleton className="h-10 flex-1 rounded-md" />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="flex-1">
                <Button variant="neutral" className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  {t("filter")}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t("filterByStatus")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={statusFilter.includes("IN_PROGRESS")}
                  onCheckedChange={() => toggleStatusFilter("IN_PROGRESS")}
                >
                  {t("inProgress")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter.includes("AT_RISK")}
                  onCheckedChange={() => toggleStatusFilter("AT_RISK")}
                >
                  {t("atRisk")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter.includes("COMPLETED")}
                  onCheckedChange={() => toggleStatusFilter("COMPLETED")}
                >
                  {t("completed")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearFilters}>
                  {t("clearFilters")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {isLoading ? (
            <Skeleton className="h-10 flex-1 rounded-md" />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="flex-1">
                <Button variant="neutral" className="w-full">
                  <div className="flex items-center">
                    {t("sortBy")}
                    {sortBy === "name" && (
                      <span className="ml-1 flex items-center">
                        {t("name")}
                        {sortOrder === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                      </span>
                    )}
                    {sortBy === "dueDate" && (
                      <span className="ml-1 flex items-center">
                        {t("dueDate")}
                        {sortOrder === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                      </span>
                    )}
                    {sortBy === "memberCount" && (
                      <span className="ml-1 flex items-center">
                        {t("members")}
                        {sortOrder === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                      </span>
                    )}
                    {sortBy === "progress" && (
                      <span className="ml-1 flex items-center">
                        {t("progress")}
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
                <DropdownMenuItem onClick={() => toggleSort("name")}>
                  {t("name")}
                  {sortBy === "name" &&
                    (sortOrder === "asc" ? (
                      <ArrowUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 h-3 w-3" />
                    ))}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleSort("dueDate")}>
                  {t("dueDate")}
                  {sortBy === "dueDate" &&
                    (sortOrder === "asc" ? (
                      <ArrowUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 h-3 w-3" />
                    ))}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleSort("memberCount")}>
                  {t("members")}
                  {sortBy === "memberCount" &&
                    (sortOrder === "asc" ? (
                      <ArrowUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 h-3 w-3" />
                    ))}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleSort("progress")}>
                  {t("progress")}
                  {sortBy === "progress" &&
                    (sortOrder === "asc" ? (
                      <ArrowUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 h-3 w-3" />
                    ))}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <ActiveFilters
          statusFilter={statusFilter}
          searchQuery={searchQuery}
          isLoading={isLoading}
          setSearchQuery={setSearchQuery}
          toggleStatusFilter={toggleStatusFilter}
          clearFilters={clearFilters}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("placeholder")}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
          />
          {searchQuery && (
            <Button
              variant="neutral"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => setSearchQuery("")}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {isLoading ? (
            <Skeleton className="h-10 w-36 rounded-md" />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="noShadow" className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  {t("filter")}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t("filterByStatus")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={statusFilter.includes("IN_PROGRESS")}
                  onCheckedChange={() => toggleStatusFilter("IN_PROGRESS")}
                >
                  {t("inProgress")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter.includes("AT_RISK")}
                  onCheckedChange={() => toggleStatusFilter("AT_RISK")}
                >
                  {t("atRisk")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter.includes("COMPLETED")}
                  onCheckedChange={() => toggleStatusFilter("COMPLETED")}
                >
                  {t("completed")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearFilters}>
                  {t("clearFilters")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {isLoading ? (
            <Skeleton className="h-10 w-36 rounded-md" />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="noShadow" className="flex items-center">
                  <div className="flex items-center">
                    {t("sortBy")}
                    {sortBy === "name" && (
                      <span className="ml-1 flex items-center">
                        {t("name")}
                        {sortOrder === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                      </span>
                    )}
                    {sortBy === "dueDate" && (
                      <span className="ml-1 flex items-center">
                        {t("dueDate")}
                        {sortOrder === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                      </span>
                    )}
                    {sortBy === "memberCount" && (
                      <span className="ml-1 flex items-center">
                        {t("members")}
                        {sortOrder === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        )}
                      </span>
                    )}
                    {sortBy === "progress" && (
                      <span className="ml-1 flex items-center">
                        {t("progress")}
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
                <DropdownMenuItem onClick={() => toggleSort("name")}>
                  {t("name")}
                  {sortBy === "name" &&
                    (sortOrder === "asc" ? (
                      <ArrowUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 h-3 w-3" />
                    ))}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleSort("dueDate")}>
                  {t("dueDate")}
                  {sortBy === "dueDate" &&
                    (sortOrder === "asc" ? (
                      <ArrowUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 h-3 w-3" />
                    ))}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleSort("memberCount")}>
                  {t("members")}
                  {sortBy === "memberCount" &&
                    (sortOrder === "asc" ? (
                      <ArrowUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 h-3 w-3" />
                    ))}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleSort("progress")}>
                    {t("progress")}
                  {sortBy === "progress" &&
                    (sortOrder === "asc" ? (
                      <ArrowUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 h-3 w-3" />
                    ))}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <ActiveFilters
        statusFilter={statusFilter}
        searchQuery={searchQuery}
        isLoading={isLoading}
        setSearchQuery={setSearchQuery}
        toggleStatusFilter={toggleStatusFilter}
        clearFilters={clearFilters}
      />
    </div>
  );
}

function ActiveFilters({
  statusFilter,
  searchQuery,
  isLoading,
  setSearchQuery,
  toggleStatusFilter,
  clearFilters,
}: {
  statusFilter: string[];
  searchQuery: string;
  isLoading: boolean;
  setSearchQuery: (query: string) => void;
  toggleStatusFilter: (status: string) => void;
  clearFilters: () => void;
}) {
  const t = useTranslations("ProjectsPage.filter");
  if ((statusFilter.length === 0 && !searchQuery) || isLoading) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-muted-foreground">{t("activeFilters")}:</span>
      {searchQuery && (
        <Badge variant="neutral" className="flex items-center gap-1">
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
          variant="neutral"
          className="flex items-center gap-1"
        >
          <span>
            {status === "IN_PROGRESS"
              ? t("inProgress")
              : status === "AT_RISK"
              ? t("atRisk")
              : t("completed")}
          </span>
          <Button
            variant="noShadow"
            size="sm"
            className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => toggleStatusFilter(status)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
      <Button
        variant="noShadow"
        size="sm"
        className="text-xs h-6 text-muted-foreground hover:text-foreground"
        onClick={clearFilters}
      >
        {t("clearFilters")}
      </Button>
    </div>
  );
}
