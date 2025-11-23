import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectCompletionAlertProps {
  onOpenDialog: () => void;
}

export default function ProjectCompletionAlert({
  onOpenDialog,
}: ProjectCompletionAlertProps) {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg mb-4 flex items-start">
      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-amber-800 dark:text-amber-300 font-medium">
          All tasks are completed!
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          The project is ready to be marked as completed.
        </p>
      </div>
      <div className="ml-4">
        <Button
          variant="outline"
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
          onClick={onOpenDialog}
        >
          Mark as Completed
        </Button>
      </div>
    </div>
  );
}
