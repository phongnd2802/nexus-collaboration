"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useFormatter, useTranslations } from "next-intl";
import { Separator } from "@/components/ui/separator";
import ProfileImageUpload from "@/components/profile/ProfileImageUpload";

interface ProfileSidebarProps {
  dateJoined: string;
  projectsCount: number;
}

export function ProfileSidebar({
  dateJoined,
  projectsCount,
}: ProfileSidebarProps) {
  const t = useTranslations("ProfilePage.sidebar");
  const format = useFormatter();
  return (
    <Card className="col-span-1 md:row-span-2 h-fit">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <ProfileImageUpload
            onImageUpdated={() => {
              // Optional: Refresh profile data if needed
            }}
          />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          {t("uploadInstruction")}
        </p>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 border-t border-border pt-6">
        <div className="w-full">
          <h3 className="text-sm font-medium text-foreground mb-2">
            {t("accountSummary")}
          </h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("memberSince")}</span>
            <span className="text-foreground">
              {dateJoined
                ? format
                    .dateTime(new Date(dateJoined), {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                    .replace("tháng", "Tháng")
                : ""}
            </span>
          </div>
          <Separator className="my-2" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("projects")}</span>
            <span className="text-foreground">{projectsCount}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
