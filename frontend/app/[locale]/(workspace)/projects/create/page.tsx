"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  FolderPlus,
  CheckCircle2,
  AlertTriangle,
  Paperclip,
} from "lucide-react";
import ProjectFileUpload from "@/components/projects/ProjectFileUpload";
import { useCreateProject } from "@/hooks/useCreateProject";
import ProjectBasicInfo from "@/components/projects/create/ProjectBasicInfo";
import ProjectDateSelection from "@/components/projects/create/ProjectDateSelection";
import ProjectPreview from "@/components/projects/create/ProjectPreview";
import ProjectTips from "@/components/projects/create/ProjectTips";
import { useTranslations } from "next-intl";

export default function NewProjectPage() {
  const t = useTranslations("ProjectsPage.create");
  const { data: session, status } = useSession();
  const router = useRouter();
  const { formData, updateField, handleSubmit, isSubmitting, error } =
    useCreateProject();

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    router.push("/auth/signin?callbackUrl=/projects/new");
    return null;
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col min-h-[80vh]">
        <div className="grow flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-main mx-auto" />
            <p className="text-muted-foreground">{t("loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground mt-1">{t("description")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-red-600 dark:text-red-400 text-sm mb-6 flex items-start">
                <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <ProjectBasicInfo
                name={formData.name}
                setName={(value) => updateField("name", value)}
                description={formData.description}
                setDescription={(value) => updateField("description", value)}
              />

              <ProjectDateSelection
                dueDate={formData.dueDate}
                setDueDate={(value) => updateField("dueDate", value)}
                dueTime={formData.dueTime}
                setDueTime={(value) => updateField("dueTime", value)}
              />

              <div className="space-y-2">
                <Label
                  htmlFor="project-files"
                  className="text-base font-medium flex items-center"
                >
                  <Paperclip className="h-4 w-4 mr-2 text-main" />
                  {t("projectFiles")}
                </Label>
                <ProjectFileUpload
                  files={formData.files}
                  setFiles={(files) => updateField("files", files)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("projectFilesDescription")}
                </p>
              </div>

              <div className="pt-4">
                <Separator className="mb-6" />
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <Button
                    type="button"
                    variant="neutral"
                    onClick={() => router.push("/dashboard")}
                    className="order-2 sm:order-1"
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    className="bg-main hover:bg-main/80 dark:bg-main/80 dark:hover:bg-main text-white order-1 sm:order-2"
                    disabled={!formData.name || isSubmitting}
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("creating")}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {t("createProject")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <ProjectPreview
            name={formData.name}
            dueDate={formData.dueDate}
            dueTime={formData.dueTime}
            filesCount={formData.files.length}
          />
          <ProjectTips />
        </div>
      </div>
    </div>
  );
}
