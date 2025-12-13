"use client";

import type React from "react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { User, Mail, Briefcase, Users, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface PersonalInfoFormProps {
  formData: {
    name: string;
    email: string;
    jobTitle: string;
    department: string;
    skills: string;
    bio: string;
  };
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
}

export function PersonalInfoForm({
  formData,
  handleInputChange,
}: PersonalInfoFormProps) {
  const t = useTranslations("ProfilePage.personalInfo");

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t("fullName")}</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="pl-10"
                  placeholder={t("fullNamePlaceholder")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10"
                  placeholder={t("emailPlaceholder")}
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("emailHelper")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">{t("jobTitle")}</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="jobTitle"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  className="pl-10"
                  placeholder={t("jobTitlePlaceholder")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">{t("department")}</Label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="pl-10"
                  placeholder={t("departmentPlaceholder")}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">{t("skills")}</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="skills"
                name="skills"
                value={formData.skills}
                onChange={handleInputChange}
                className="pl-10"
                placeholder={t("skillsPlaceholder")}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("skillsHelper")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">{t("bio")}</Label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={t("bioPlaceholder")}
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
