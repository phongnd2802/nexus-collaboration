import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import TaskCard from "@/components/tasks/TaskCard";
import { Task } from "@/types/index";
import { useTranslations } from "next-intl";

interface TasksSectionProps {
  tasks: Task[];
  currentUserId?: string;
}

export default function TasksSection({
  tasks,
  currentUserId,
}: TasksSectionProps) {
  const t = useTranslations("DashboardPage.taskSection");
  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center justify-between">
        <h2 className="text-xl font-semibold">{t("yourTasks")}</h2>
        <Button
          asChild
          variant="neutral"
          className="text-sm text-muted-foreground hover:text-main dark:hover:text-main"
          size="sm"
        >
          <Link href="/tasks" className="flex items-center">
            {t("viewAll")}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t("noTasks")}
            </h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              {t("noTasksDescription")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
