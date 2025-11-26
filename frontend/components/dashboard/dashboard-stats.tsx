import { Card, CardContent } from "@/components/ui/card";
import { LayoutGrid, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface StatsProps {
  stats: {
    totalProjects: number;
    completedTasks: number;
    pendingTasks: number;
    upcomingDeadlines: number;
  };
}

export default function DashboardStats({ stats }: StatsProps) {
  const t = useTranslations("DashboardStats");
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Link href="/projects">
        <Card
          className="
        bg-linear-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 border-violet-100 dark:border-violet-900/50
        border-border border-2 shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none
        "
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-violet-100 dark:bg-violet-900/50 p-2">
                <LayoutGrid className="h-5 w-5 text-violet-700 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("totalProjects")}
                </p>
                <h3 className="text-2xl font-bold">{stats.totalProjects}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      <Link href="/tasks">
        <Card
          className="bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border-green-100 dark:border-green-900/50
        border-border border-2 shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 dark:bg-green-900/50 p-2">
                <CheckCircle className="h-5 w-5 text-green-700 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("completedTasks")}
                </p>
                <h3 className="text-2xl font-bold">{stats.completedTasks}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      <Link href="/tasks">
        <Card
          className="bg-linear-to-br from-blue-50 to-sky-50 dark:from-blue-950/40 dark:to-sky-950/40 border-blue-100 dark:border-blue-900/50
        border-border border-2 shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-2">
                <Clock className="h-5 w-5 text-blue-700 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("pendingTasks")}
                </p>
                <h3 className="text-2xl font-bold">{stats.pendingTasks}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      <Link href="/calendar?tab=deadlines">
        <Card
          className="bg-linear-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40 border-amber-100 dark:border-amber-900/50
        border-border border-2 shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/50 p-2">
                <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("upcomingDeadlines")}
                </p>
                <h3 className="text-2xl font-bold">
                  {stats.upcomingDeadlines}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
