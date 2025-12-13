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
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface MemberRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: any;
  newRole: string;
  onConfirm: () => void;
  isUpdating: boolean;
}

export default function MemberRoleDialog({
  open,
  onOpenChange,
  member,
  newRole,
  onConfirm,
  isUpdating,
}: MemberRoleDialogProps) {
  const t = useTranslations("memberRoleDialog");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("change_member_role")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("are_you_sure_you_want_to_change_this_member_s_role_from")}{" "}
            {member?.currentRole} {t("to")} {newRole}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUpdating}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isUpdating}
            className="bg-main hover:bg-main text-white"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("updating")}...
              </>
            ) : (
              t("confirm")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
