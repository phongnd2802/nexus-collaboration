import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProjectPreviewProps {
  name: string;
  dueDate: string;
  dueTime: string;
  filesCount: number;
}

export default function ProjectPreview({
  name,
  dueDate,
  dueTime,
  filesCount,
}: ProjectPreviewProps) {
  const t = useTranslations("ProjectsPage.create");
  return (
    <Card>
      <CardContent>
        <div className="text-lg pb-4">{t("projectPreview")}</div>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-sm text-muted-foreground mb-1.5">
              {t("name")}
            </h3>
            <p className="font-medium">
              {name || t("namePlaceholderPreview")}
            </p>
          </div>

          {dueDate && (
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1.5">
                {t("dueDate")}
              </h3>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-main" />
                <span>
                  {new Date(dueDate).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {dueTime ? ` at ${dueTime}` : ""}
                </span>
              </div>
            </div>
          )}

          <div>
            <h3 className="font-medium text-sm text-muted-foreground mb-1.5">
              {t("teamMembers")}
            </h3>
            <div className="flex items-center text-sm">
              <Users className="h-4 w-4 mr-2 text-main" />
              <span>{t("youAdmin")}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("youCanInvite")}
            </p>
          </div>

          {filesCount > 0 && (
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1.5">
                {t("attachedFiles")}
              </h3>
              <div className="flex items-center text-sm">
                <Paperclip className="h-4 w-4 mr-2 text-main" />
                <span>{filesCount} {t("file")}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
