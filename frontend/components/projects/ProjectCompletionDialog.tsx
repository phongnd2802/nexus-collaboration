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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("ProjectDetailPage");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("mark_as_completed")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("mark_as_completed_description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
            disabled={isUpdating}
          >
            {isUpdating ? t("updating") : t("mark_as_completed")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
