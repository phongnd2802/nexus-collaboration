import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ProjectTips() {
  const t = useTranslations("ProjectsPage.tips");
  return (
    <Card>
      <CardContent>
        <div className="text-lg pb-4">{t("title")}</div>
        <div className="space-y-3 text-sm">
          <div className="flex items-start">
            <Lightbulb className="h-8 w-8 mr-2 text-amber-500 mt-0.5" />
            <span>{t("tip1")}</span>
          </div>
          <div className="flex items-start">
            <Lightbulb className="h-8 w-8 mr-2 text-amber-500 mt-0.5" />
            <span>{t("tip2")}</span>
          </div>
          <div className="flex items-start">
            <Lightbulb className="h-8 w-8 mr-2 text-amber-500 mt-0.5" />
            <span>{t("tip3")}</span>
          </div>
          <div className="flex items-start">
            <Lightbulb className="h-8 w-8 mr-2 text-amber-500 mt-0.5" />
            <span>{t("tip4")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
