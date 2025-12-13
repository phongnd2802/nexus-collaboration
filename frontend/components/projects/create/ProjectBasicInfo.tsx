import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProjectBasicInfoProps {
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
}

export default function ProjectBasicInfo({
  name,
  setName,
  description,
  setDescription,
}: ProjectBasicInfoProps) {
  const t = useTranslations("ProjectsPage.create");
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label
          htmlFor="project-name"
          className="text-base font-medium flex items-center"
        >
          <FileText className="h-4 w-4 mr-2 text-main" />
          {t("name")}*
        </Label>
        <Input
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          className="h-11"
          required
        />
        <p className="text-xs text-muted-foreground">
          {t("nameDescription")}
        </p>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="project-description"
          className="text-base font-medium flex items-center"
        >
          <FileText className="h-4 w-4 mr-2 text-main" />
          {t("projectDescription")}
        </Label>
        <Textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          className="min-h-[120px] resize-y"
          rows={5}
        />
        <p className="text-xs text-muted-foreground">
          {t("descriptionDescription")}
        </p>
      </div>
    </div>
  );
}
