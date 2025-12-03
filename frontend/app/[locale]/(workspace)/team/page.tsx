"use client";

import { useTranslations } from "next-intl";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Loader2,
  Search,
  UserPlus,
  MessageSquare,
  Mail,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/utils";

// Interface for collaborator data
interface Collaborator {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  projectCount: number;
  commonProjects: {
    id: string;
    name: string;
    role: string;
  }[];
}

export default function TeamPage() {
  const t = useTranslations("TeamPage");
  // check of mobile
  const isMobile = useIsMobile();

  const { data: session, status } = useSession();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [filteredCollaborators, setFilteredCollaborators] = useState<
    Collaborator[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    setIsInitialRender(false);
  }, []);

  // Fetch all collaborators when authenticated
  useEffect(() => {
    if (session?.user?.id) {
      fetchCollaborators();
      fetchUserProjects();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    applyFilters();
  }, [collaborators, searchQuery, projectFilter, roleFilter]);

  const fetchCollaborators = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/collaborators/team");
      if (response.ok) {
        const data = await response.json();
        setCollaborators(data.collaborators || []);
      } else {
        toast.error(t("toast.loadError"));
      }
    } catch (error) {
      console.error("Error fetching collaborators:", error);
      toast.error(t("toast.loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProjects = async () => {
    try {
      const response = await fetch("/api/dashboard/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(
          data.projects.map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
          })) || []
        );
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...collaborators];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.name?.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query)
      );
    }

    if (projectFilter !== "all") {
      filtered = filtered.filter(c =>
        c.commonProjects.some(p => p.id === projectFilter)
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(c =>
        c.commonProjects.some(p => p.role === roleFilter)
      );
    }

    setFilteredCollaborators(filtered);
  };

  if (status === "loading") {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-700" />
      </div>
    );
  }

  if (isLoading && isInitialRender) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7" />
            {t("header.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("header.description")}
          </p>
        </div>
      </div>

      {isMobile ? (
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search.placeholder")}
              className="pl-9 w-full"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-col gap-2 w-full">
            {isLoading ? (
              <Skeleton className="w-full h-10 rounded-md" />
            ) : (
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("filter.projectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filter.allProjects")}</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {isLoading ? (
              <Skeleton className="w-full h-10 rounded-md" />
            ) : (
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("filter.rolePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filter.allRoles")}</SelectItem>
                  <SelectItem value="ADMIN">
                    {t("filter.roles.ADMIN")}
                  </SelectItem>
                  <SelectItem value="EDITOR">
                    {t("filter.roles.EDITOR")}
                  </SelectItem>
                  <SelectItem value="MEMBER">
                    {t("filter.roles.MEMBER")}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search.placeholder")}
              className="pl-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-2">
            {isLoading ? (
              <Skeleton className="w-[180px] h-10 rounded-md" />
            ) : (
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("filter.projectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filter.allProjects")}</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {isLoading ? (
              <Skeleton className="w-[150px] h-10 rounded-md" />
            ) : (
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t("filter.rolePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filter.allRoles")}</SelectItem>
                  <SelectItem value="ADMIN">
                    {t("filter.roles.ADMIN")}
                  </SelectItem>
                  <SelectItem value="EDITOR">
                    {t("filter.roles.EDITOR")}
                  </SelectItem>
                  <SelectItem value="MEMBER">
                    {t("filter.roles.MEMBER")}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      )}

      <Card>
        <CardContent className={isMobile ? "p-3 pt-0 pb-0" : "p-6 pt-0 pb-0"}>
          {isLoading ? (
            <div className="py-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredCollaborators.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {collaborators.length === 0
                  ? t("list.empty")
                  : t("list.noResults")}
              </p>
            </div>
          ) : (
            <div>
              {filteredCollaborators.map(collaborator => (
                <div
                  key={collaborator.id}
                  className={
                    isMobile
                      ? "flex flex-col py-4 border-b border-border last:border-0 gap-2"
                      : "flex items-center justify-between py-4 border-b border-border last:border-0"
                  }
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={collaborator.image || ""}
                        alt={collaborator.name || ""}
                      />
                      <AvatarFallback className="bg-linear-to-br from-violet-600 to-violet-800 text-white">
                        {getInitials(collaborator.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">
                        {collaborator.name || t("list.unnamedUser")}
                      </h3>
                      <p
                        className={
                          isMobile
                            ? "text-xs text-muted-foreground truncate max-w-[260px]"
                            : "text-sm text-muted-foreground"
                        }
                      >
                        {collaborator.email}
                      </p>
                    </div>
                  </div>

                  {isMobile ? (
                    <div className="flex justify-between items-center w-full mt-2">
                      <Badge
                        variant="neutral"
                        className="text-sm text-muted-foreground mr-2"
                      >
                        {t("list.projectsCount", {
                          count: collaborator.commonProjects.length,
                        })}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="neutral"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/messages?email=${collaborator.email}`}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />{" "}
                              {t("actions.message")}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`mailto:${collaborator.email}`}>
                              <Mail className="h-4 w-4 mr-2" />{" "}
                              {t("actions.email")}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/projects/create?invite=${collaborator.email}`}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />{" "}
                              {t("actions.addToProject")}
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    /* Desktop view - original layout */
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="neutral"
                        className="text-sm text-muted-foreground mr-2"
                      >
                        {t("list.projectsCount", {
                          count: collaborator.commonProjects.length,
                        })}
                      </Badge>

                      <Link
                        href={`/messages?email=${collaborator.email}`}
                        className="cursor-pointer"
                      >
                        <MessageSquare className="h-5 w-5 mr-2" />
                      </Link>
                      <Link
                        href={`mailto:${collaborator.email}`}
                        className="cursor-pointer"
                      >
                        <Mail className="h-5 w-5 mr-2" />
                      </Link>
                      <Link
                        href={`/projects/create?invite=${collaborator.email}`}
                        className="cursor-pointer"
                      >
                        <UserPlus className="h-5 w-5 mr-2" />
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading && !isInitialRender && (
        <div className="fixed bottom-4 right-4 bg-background shadow-lg rounded-full p-2 z-50 border">
          <Loader2 className="h-6 w-6 animate-spin text-violet-700" />
        </div>
      )}
    </div>
  );
}
