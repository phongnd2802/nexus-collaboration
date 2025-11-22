import Link from "next/link";
import { AlertTriangle, FolderKanban } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TaskFormProject } from "@/hooks/useTaskForm";

interface TaskFormProjectSelectProps {
  projectId: string;
  projects: TaskFormProject[];
  errors: Record<string, string>;
  handleSelectChange: (name: string, value: string) => void;
  mode: "create" | "edit";
}

export function TaskFormProjectSelect({
  projectId,
  projects,
  errors,
  handleSelectChange,
  mode,
}: TaskFormProjectSelectProps) {
  if (mode !== "create") return null;

  return (
    <div className="space-y-2">
      <>
        <Label
          htmlFor="project"
          className={cn(
            "text-base font-medium flex items-center",
            errors.projectId && "text-destructive"
          )}
        >
          <FolderKanban className="h-4 w-4 mr-2 text-violet-600" />
          Project*
        </Label>

        <Select
          value={projectId}
          onValueChange={(value) => handleSelectChange("projectId", value)}
          required
        >
          <SelectTrigger
            id="project"
            className={cn("h-11", errors.projectId && "border-destructive")}
          >
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.length > 0
              ? projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))
              : null}
          </SelectContent>
        </Select>
      </>

      {errors.projectId && (
        <p className="text-sm text-destructive">{errors.projectId}</p>
      )}

      {projects.length === 0 && (
        <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-400 flex items-start">
            <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>
              You need to be a member of at least one project to create tasks.{" "}
              <Link
                href="/projects/create"
                className="font-medium underline underline-offset-2"
              >
                Create a project
              </Link>
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
