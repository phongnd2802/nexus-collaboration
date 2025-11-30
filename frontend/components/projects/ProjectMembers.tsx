"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserCog } from "lucide-react";
import { useProjectMembers } from "@/hooks/useProjectMembers";
import ProjectMemberItem from "./ProjectMemberItem";
import MemberRoleDialog from "./MemberRoleDialog";
import MemberRemoveDialog from "./MemberRemoveDialog";
import { useTranslations } from "next-intl";

interface ProjectMembersProps {
  projectId: string;
  project: any;
  onMembersUpdated: () => void;
}

export default function ProjectMembers({
  projectId,
  project,
  onMembersUpdated,
}: ProjectMembersProps) {
  const t = useTranslations("ProjectDetailPage");
  const {
    session,
    members,
    isLoading,
    isCreator,
    canChangeRole,
    handleRoleChange,
    handleRemoveMember,
    confirmRoleChange,
    confirmRemoveMember,
    isUpdatingRole,
    isRemoving,
    confirmOpen,
    setConfirmOpen,
    removeConfirmOpen,
    setRemoveConfirmOpen,
    memberToUpdate,
    newRole,
  } = useProjectMembers({
    projectId,
    project,
    onMembersUpdated,
  });

  return (
    <Card className="w-full flex flex-1">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex">
            <UserCog className="h-5 w-5 mr-2" />
            {t("team_members")}
          </span>
          <span className="text-sm text-muted-foreground">
            {members.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-main" />
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <ProjectMemberItem
                key={member.userId}
                member={member}
                session={session}
                isCreator={isCreator}
                projectCreatorId={project.creatorId}
                canChangeRole={canChangeRole}
                onRoleChange={handleRoleChange}
                onRemove={handleRemoveMember}
              />
            ))}

            {members.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                {t("no_team_members_found")}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <MemberRoleDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        member={memberToUpdate}
        newRole={newRole}
        onConfirm={confirmRoleChange}
        isUpdating={isUpdatingRole}
      />

      <MemberRemoveDialog
        open={removeConfirmOpen}
        onOpenChange={setRemoveConfirmOpen}
        onConfirm={confirmRemoveMember}
        isRemoving={isRemoving}
      />
    </Card>
  );
}
