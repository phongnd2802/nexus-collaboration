import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, UserCog, UserMinus } from "lucide-react";
import { getProfileUrl } from "@/lib/profile-utils";
import { getInitials } from "@/lib/utils";
import { getRoleBadge } from "@/lib/badge-utils";
import { Session } from "next-auth";

interface ProjectMemberItemProps {
  member: any;
  session: Session | null;
  isCreator: boolean;
  projectCreatorId: string;
  canChangeRole: (role: string) => boolean;
  onRoleChange: (memberId: string, role: string, userId: string) => void;
  onRemove: (memberId: string, userId: string) => void;
}

export default function ProjectMemberItem({
  member,
  session,
  isCreator, // Current user is creator
  projectCreatorId,
  canChangeRole,
  onRoleChange,
  onRemove,
}: ProjectMemberItemProps) {
  return (
    <div className="flex md:items-center md:justify-between border-b border-border/40 last:border-0 pb-3 last:pb-0 flex-col md:flex-row">
      <div className="flex items-center">
        <Link
          href={getProfileUrl(member.user?.email, session?.user?.email)}
          className="cursor-pointer hover:opacity-80 transition-opacity mr-3"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={member.user?.image || ""}
              alt={member.user?.name || "Unknown user"}
            />
            <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">
              {getInitials(member.user?.name)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div>
          <p className="font-medium">
            {member.user?.name || "Unknown user"}
            {projectCreatorId === member.userId && (
              <span className="ml-2 text-xs text-muted-foreground">
                (Creator)
              </span>
            )}
            {member.userId === session?.user?.id && (
              <span className="ml-2 text-xs text-muted-foreground">(You)</span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">{member.user?.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto md:ml-0 mt-2 md:mt-0">
        {getRoleBadge(member.role)}

        {session?.user?.id !== member.userId && canChangeRole(member.role) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="neutral" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={member.role === "ADMIN"}
                className={
                  member.role === "ADMIN" ? "opacity-50 cursor-not-allowed" : ""
                }
                onClick={() => onRoleChange(member.id, "ADMIN", member.userId)}
              >
                <UserCog className="h-4 w-4 mr-2" />
                Make Admin
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={member.role === "EDITOR"}
                className={
                  member.role === "EDITOR"
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }
                onClick={() => onRoleChange(member.id, "EDITOR", member.userId)}
              >
                <UserCog className="h-4 w-4 mr-2" />
                Make Editor
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={member.role === "MEMBER"}
                className={
                  member.role === "MEMBER"
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }
                onClick={() => onRoleChange(member.id, "MEMBER", member.userId)}
              >
                <UserCog className="h-4 w-4 mr-2" />
                Make Member
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500"
                onClick={() => onRemove(member.id, member.userId)}
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Remove Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
