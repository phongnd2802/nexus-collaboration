"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { encodePassphrase, randomString } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Video, Shield, Users, LogIn, RefreshCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useProjects } from "@/hooks/use-projects";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

function Meeting() {
  const t = useTranslations("MeetingsPage");
  const router = useRouter();
  const locale = useLocale();
  const [e2ee, setE2ee] = useState(false);
  const [sharedPassphrase, setSharedPassphrase] = useState(randomString(64));
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<{
    active: boolean;
    numParticipants: number;
  } | null>(null);

  const { projects, isLoading } = useProjects();

  const checkMeetingStatus = async (projectId: string) => {
    if (!projectId) {
      setActiveMeeting(null);
      return;
    }

    setIsCheckingStatus(true);
    try {
      const response = await fetch(`/api/meetings/${projectId}/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActiveMeeting(data);
      } else {
        console.error("Failed to check meeting status");
        setActiveMeeting(null);
      }
    } catch (error) {
      console.error("Error checking meeting status:", error);
      setActiveMeeting(null);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Check status when project changes
  useEffect(() => {
    checkMeetingStatus(selectedProjectId);

    // Set up polling interval if a project is selected
    let interval: NodeJS.Timeout;
    if (selectedProjectId) {
      interval = setInterval(() => {
        checkMeetingStatus(selectedProjectId);
      }, 10000); // Check every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedProjectId]);

  const startMeeting = () => {
    if (!selectedProjectId) return;

    // Use project ID as the room ID
    const targetRoomId = selectedProjectId;

    if (e2ee) {
      window.open(
        `/${locale}/rooms/${targetRoomId}#${encodePassphrase(
          sharedPassphrase
        )}`,
        "_blank"
      );
    } else {
      window.open(`/${locale}/rooms/${targetRoomId}`, "_blank");
    }
  };

  const isMeetingActive = activeMeeting?.active;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-main rounded-base border-2 border-border shadow-shadow">
          <Video className="h-6 w-6 text-main-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-heading text-foreground">{t("title")}</h1>
          <p className="text-sm text-foreground/70">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Start/Join Meeting Card */}
        <Card className="animate-slideUp animation-delay-200 col-span-2 md:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-main" />
                {isMeetingActive ? t("startMeeting.titleActive") : t("startMeeting.title")}
              </CardTitle>
              {activeMeeting?.active && (
                <Badge
                  variant="default"
                  className="bg-green-500 hover:bg-green-600 border-green-600 animate-pulse"
                >
                  {t("startMeeting.liveNow")} • {t("startMeeting.participants", { count: activeMeeting.numParticipants })}
                </Badge>
              )}
            </div>
            <CardDescription>
              {isMeetingActive
                ? t("startMeeting.descriptionActive")
                : t("startMeeting.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="project-select">{t("startMeeting.projectLabel")}</Label>
                {selectedProjectId && (
                  <Button
                    variant="neutral"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => checkMeetingStatus(selectedProjectId)}
                    disabled={isCheckingStatus}
                    title={t("startMeeting.refreshStatus")}
                  >
                    <RefreshCcw
                      className={`h-3 w-3 ${
                        isCheckingStatus ? "animate-spin" : ""
                      }`}
                    />
                  </Button>
                )}
              </div>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={isLoading}
              >
                <SelectTrigger id="project-select">
                  <SelectValue
                    placeholder={
                      isLoading ? t("startMeeting.loadingProjects") : t("startMeeting.selectProject")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                  {projects.length === 0 && !isLoading && (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {t("startMeeting.noProjects")}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={startMeeting}
              className={`w-full ${
                isMeetingActive
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : ""
              }`}
              size="lg"
              disabled={!selectedProjectId}
            >
              {isMeetingActive ? (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  {t("startMeeting.joinButton")}
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  {t("startMeeting.startButton")}
                </>
              )}
            </Button>

            {isMeetingActive && (
              <p className="text-xs text-center text-muted-foreground">
                {t("startMeeting.joinHint")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Security Options Card */}
        <Card className="animate-slideUp animation-delay-300 col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-main" />
              {t("security.title")}
            </CardTitle>
            <CardDescription>
              {t("security.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="use-e2ee"
                checked={e2ee}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  setE2ee(checked === true)
                }
                disabled={!!isMeetingActive} // Disable if joining an existing meeting (usually inherits settings, but for now simple)
              />
              <div className="space-y-1">
                <Label
                  htmlFor="use-e2ee"
                  className={`cursor-pointer ${
                    isMeetingActive ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {t("security.enableE2EE")}
                </Label>
                <p className="text-xs text-foreground/60">
                  {isMeetingActive
                    ? t("security.e2eeDescriptionActive")
                    : t("security.e2eeDescription")}
                </p>
              </div>
            </div>

            {e2ee && !isMeetingActive && (
              <div className="space-y-2 pt-2 border-t-2 border-border">
                <Label htmlFor="passphrase">{t("security.passphraseLabel")}</Label>
                <Input
                  id="passphrase"
                  type="password"
                  value={sharedPassphrase}
                  onChange={(ev) => setSharedPassphrase(ev.target.value)}
                  placeholder={t("security.passphrasePlaceholder")}
                />
                <p className="text-xs text-foreground/60">
                  {t("security.passphraseHint")}
                </p>
              </div>
            )}

            {/* Show info if active meeting */}
            {isMeetingActive && (
              <div className="p-3 bg-muted/50 rounded-md border border-border">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t("security.currentParticipants", { count: activeMeeting?.numParticipants })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Page() {
  return <Meeting />;
}
