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
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change Member Role</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to change this member's role from{" "}
            {member?.currentRole} to {newRole}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isUpdating}
            className="bg-violet-700 hover:bg-violet-800 text-white"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Confirm"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
