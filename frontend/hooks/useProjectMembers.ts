import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface UseProjectMembersProps {
  projectId: string;
  project: any;
  onMembersUpdated: () => void;
}

export function useProjectMembers({
  projectId,
  project,
  onMembersUpdated,
}: UseProjectMembersProps) {
  const { data: session } = useSession();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [memberToUpdate, setMemberToUpdate] = useState<any>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<any>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (project && session?.user?.id) {
      const isUserCreator = project.creatorId === session.user.id;
      setIsCreator(isUserCreator);

      if (isUserCreator) {
        setUserRole("ADMIN");
        setIsAdmin(true);
      } else {
        const userMember = project.members.find(
          (m: any) => m.userId === session.user.id
        );
        if (userMember) {
          setUserRole(userMember.role);
          setIsAdmin(userMember.role === "ADMIN");
        }
      }

      setMembers(project.members);
    }
  }, [project, session?.user?.id]);

  const canChangeRole = (memberRole: string) => {
    // Creator (Admin) can change role for everybody
    if (isCreator) return true;

    // Other admins can change roles of editors and members
    if (isAdmin && memberRole !== "ADMIN") return true;

    // Editors and members cannot change roles
    return false;
  };

  const handleRoleChange = (memberId: string, role: string, userId: string) => {
    const member = members.find((m) => m.userId === userId);
    if (!member) return;

    setMemberToUpdate({ id: memberId, userId, role, currentRole: member.role });
    setNewRole(role);
    setConfirmOpen(true);
  };

  const confirmRoleChange = async () => {
    if (!memberToUpdate) return;

    setIsUpdatingRole(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-member-id": memberToUpdate.id,
        },
        body: JSON.stringify({
          role: newRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update member role");
      }

      setMembers((prevMembers) =>
        prevMembers.map((member) =>
          member.userId === memberToUpdate.userId
            ? { ...member, role: newRole }
            : member
        )
      );

      toast.success(`Member role updated successfully`);
      onMembersUpdated();
    } catch (error) {
      console.error("Error updating member role:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update member role"
      );
    } finally {
      setIsUpdatingRole(false);
      setConfirmOpen(false);
      setMemberToUpdate(null);
    }
  };

  const handleRemoveMember = (memberId: string, userId: string) => {
    setMemberToRemove({ id: memberId, userId });
    setRemoveConfirmOpen(true);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsRemoving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-member-id": memberToRemove.id,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to remove member");
      }

      setMembers((prevMembers) =>
        prevMembers.filter((member) => member.userId !== memberToRemove.userId)
      );

      toast.success("Member removed successfully");
      onMembersUpdated();
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to remove member"
      );
    } finally {
      setIsRemoving(false);
      setRemoveConfirmOpen(false);
      setMemberToRemove(null);
    }
  };

  return {
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
  };
}
