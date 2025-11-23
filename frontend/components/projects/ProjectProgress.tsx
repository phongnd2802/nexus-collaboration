import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock } from "lucide-react";

interface ProjectProgressProps {
  completionPercentage: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  children?: React.ReactNode; // For the alert
}

export default function ProjectProgress({
  completionPercentage,
  completedTasks,
  inProgressTasks,
  todoTasks,
  children,
}: ProjectProgressProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {children}

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Overall Completion</span>
              <span className="text-sm font-medium">
                {completionPercentage}%
              </span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-4 flex items-center">
              <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-800/30 flex items-center justify-center mr-3">
                <CheckCircle2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-xl font-bold">{completedTasks} tasks</p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 flex items-center">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center mr-3">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-xl font-bold">{inProgressTasks} tasks</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/20 rounded-lg p-4 flex items-center">
              <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700/30 flex items-center justify-center mr-3">
                <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">To Do</p>
                <p className="text-xl font-bold">{todoTasks} tasks</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
