import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProjectCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isUpdating: boolean;
}

export default function ProjectCompletionDialog({
  open,
  onOpenChange,
  onConfirm,
  isUpdating,
}: ProjectCompletionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark Project as Completed?</AlertDialogTitle>
          <AlertDialogDescription>
            All tasks in this project are complete. Changing the project status
            to "Completed" will notify all team members that the project has
            been finalized.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
            disabled={isUpdating}
          >
            {isUpdating ? "Updating..." : "Mark as Completed"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
