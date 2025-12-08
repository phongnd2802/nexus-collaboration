"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  Calendar,
  Edit,
  UserPlus,
  PlusCircle,
  MessageSquare,
  Menu,
  Trash2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStatusBadge } from "@/lib/badge-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EditProjectDialog from "./EditProjectDialog";
import DeleteProjectDialog from "./DeleteProjectDialog";
import InviteDialog from "./InviteDialog";
import PdfPreviewDialog from "../tasks/PdfPreviewDialog";
import { Project, Task } from "@/types/index";
import { formatDate } from "@/lib/utils";

interface ProjectHeaderProps {
  project: Project;
  isAdmin: boolean;
  isEditor?: boolean;
  tasks: Task[];
  onProjectUpdated: () => void;
}

export default function ProjectHeader({
  project,
  isAdmin,
  isEditor,
  tasks,
  onProjectUpdated,
}: ProjectHeaderProps) {
  const t = useTranslations("DashboardPage.projectCard");
  const { data: session } = useSession();
  const locale = useLocale();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [currentFileName, setCurrentFileName] = useState("");

  const formattedDueDate = formatDate(project.dueDate, t, locale, {
    includeTime: true,
  });

  const handleEditClick = () => {
    setIsEditDialogOpen(true);
  };

  const handleInviteClick = () => {
    setIsInviteDialogOpen(true);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleExportPdf = async (filter: "assignee" | "creator") => {
    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
        }/api/export/projects/${project.id}/pdf?filter=${filter}&lang=${locale}`,
        {
          method: "GET",
          headers: {
            "x-user-id": session?.user?.id || "",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      setPdfBlob(blob);
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      const fileName = `Project-${project.name}-${
        filter === "assignee" ? "MyTasks" : "CreatedByMe"
      }.pdf`;
      setCurrentFileName(fileName);
      setPdfPreviewOpen(true);
    } catch (error) {
      console.error("Failed to export Project PDF", error);
    }
  };

  // Export visibility logic
  const myAssigneeTasksCount = tasks.filter(
    t => t.assigneeId === session?.user?.id
  ).length;
  const canExportAssigned = isAdmin || isEditor || myAssigneeTasksCount > 0;
  const canExportCreated = isAdmin || isEditor;
  const showExportButton = canExportCreated || canExportAssigned;

  return (
    <div className="w-full">
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
        <div className="max-w-full">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 line-clamp-2 overflow-hidden text-ellipsis break-all">
            {project.name}
          </h1>
          <div
            onClick={handleEditClick}
            className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground cursor-pointer"
          >
            {getStatusBadge(project.status, t)}
            <span className="flex items-center">
              <Calendar className="h-4 w-4 mr-1 shrink-0" />
              {formattedDueDate}
            </span>
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex md:flex-row gap-2">
          <Button
            variant="neutral"
            size="sm"
            className="flex items-center"
            asChild
          >
            <Link href={`/messages?projectId=${project.id}`}>
              <MessageSquare className="h-4 w-4 mr-2" />
              {t("team")}
            </Link>
          </Button>

          {/* Export Button Logic */}
          {(showExportButton || (!isAdmin && !isEditor)) && (
            <>
              {!isAdmin && !isEditor && myAssigneeTasksCount === 0 ? (
                <Button
                  variant="neutral"
                  size="sm"
                  className="flex items-center"
                  onClick={() => toast.error(t("no_assigned_tasks"))}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t("export_pdf")}
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="neutral"
                      size="sm"
                      className="flex items-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t("export_pdf")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canExportAssigned && (
                      <DropdownMenuItem
                        onClick={() => handleExportPdf("assignee")}
                      >
                        {t("export_assigned")}
                      </DropdownMenuItem>
                    )}
                    {canExportCreated && (
                      <DropdownMenuItem
                        onClick={() => handleExportPdf("creator")}
                      >
                        {t("export_created")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}

          {isAdmin && (
            <>
              <Button
                variant="neutral"
                size="sm"
                className="flex items-center"
                onClick={handleEditClick}
              >
                <Edit className="h-4 w-4 mr-2" />
                {t("edit")}
              </Button>
              <Button
                variant="neutral"
                size="sm"
                className="flex items-center"
                onClick={handleInviteClick}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t("invite")}
              </Button>
            </>
          )}
          {(isAdmin || isEditor) && (
            <Button asChild size="sm">
              <Link href={`/tasks/create?projectId=${project.id}`}>
                <PlusCircle className="h-4 w-4 mr-2" />
                {t("create_task")}
              </Link>
            </Button>
          )}
        </div>

        {/* Mobile Actions */}
        <div className="flex md:hidden justify-between gap-2">
          <Button
            variant="neutral"
            size="sm"
            className="flex-1 flex items-center justify-center"
            asChild
          >
            <Link href={`/messages?projectId=${project.id}`}>
              <MessageSquare className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="sm:inline">{t("team")}</span>
            </Link>
          </Button>

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="neutral" size="sm" className="flex-1">
                  <Menu className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="sm:inline">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditClick}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t("edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInviteClick}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t("invite")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {(isAdmin || isEditor) && (
            <Button
              asChild
              className="flex-1 bg-violet-700 hover:bg-violet-800 text-white flex items-center justify-center"
              size="sm"
            >
              <Link href={`/tasks/create?projectId=${project.id}`}>
                <PlusCircle className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="sm:inline">Task</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {project.description && (
        <div className="mt-4 max-w-full">
          <p className="text-sm sm:text-base text-main-foreground wrap-break-word">
            {project.description}
          </p>
        </div>
      )}

      {/* Dialog Components */}
      <EditProjectDialog
        project={project}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onProjectUpdated={onProjectUpdated}
        onDeleteClick={handleDeleteClick}
      />

      <DeleteProjectDialog
        project={project}
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />

      <InviteDialog
        project={project}
        isOpen={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        onProjectUpdated={onProjectUpdated}
      />

      <PdfPreviewDialog
        open={pdfPreviewOpen}
        onOpenChange={(open) => {
          setPdfPreviewOpen(open);
          if (!open && pdfUrl) {
            window.URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
            setPdfBlob(null);
            setCurrentFileName("");
          }
        }}
        pdfUrl={pdfUrl}
        fileName={currentFileName}
        onDownload={() => {
          if (pdfBlob && currentFileName) {
            const url = window.URL.createObjectURL(pdfBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = currentFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }
        }}
      />
    </div>
  );
}
