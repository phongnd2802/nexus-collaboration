import { PrismaClient } from "@prisma/client";
import { AppError } from "../utils/errors";

const prisma = new PrismaClient();

export async function getTeamCollaboratorsService(userId: string) {
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }
  const userProjects = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });

  const projectIds = userProjects.map((p: any) => p.projectId);

  if (projectIds.length === 0) {
    return { collaborators: [] };
  }

  const projectMembers = await prisma.projectMember.findMany({
    where: {
      projectId: { in: projectIds },
      userId: { not: userId },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  const collaboratorMap = new Map();

  projectMembers.forEach((member: any) => {
    const collaboratorId = member.user.id;

    if (!collaboratorMap.has(collaboratorId)) {
      collaboratorMap.set(collaboratorId, {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        image: member.user.image,
        projectCount: 0,
        commonProjects: [],
      });
    }

    const collaborator = collaboratorMap.get(collaboratorId);

    const existingProject = collaborator.commonProjects.find(
      (p: any) => p.id === member.project.id
    );

    if (!existingProject) {
      collaborator.projectCount += 1;
      collaborator.commonProjects.push({
        id: member.project.id,
        name: member.project.name,
        role: member.role,
      });
    }
  });

  const collaborators = Array.from(collaboratorMap.values()).sort(
    (a, b) => b.projectCount - a.projectCount
  );

  return { collaborators };
}

export async function searchCollaborators(userId: string, search?: string) {
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  let whereCondition: any = {
    id: { not: userId },
  };

  if (search && typeof search === "string" && search.trim().length > 0) {
    whereCondition.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where: whereCondition,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
    take: 10,
  });

  const userProjects = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });

  const projectIds = userProjects.map((p: any) => p.projectId);

  if (projectIds.length > 0) {
    const projectMembers = await prisma.projectMember.findMany({
      where: {
        projectId: { in: projectIds },
        userId: { not: userId },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    const collaboratorMap = new Map();

    projectMembers.forEach((member: any) => {
      const collaboratorId = member.user.id;

      if (!collaboratorMap.has(collaboratorId)) {
        collaboratorMap.set(collaboratorId, {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          image: member.user.image,
          projectCount: 0,
          commonProjects: [],
        });
      }

      const collaborator = collaboratorMap.get(collaboratorId);

      const existingProject = collaborator.commonProjects.find(
        (p: any) => p.id === member.projectId
      );

      if (!existingProject) {
        collaborator.projectCount += 1;
        collaborator.commonProjects.push({
          id: member.projectId,
          role: member.role,
        });
      }
    });
    const collaborators = Array.from(collaboratorMap.values());

    const collaboratorIds = new Set(collaborators.map((c: any) => c.id));
    const otherUsers = users.filter((user) => !collaboratorIds.has(user.id));
    const allUsers = [...collaborators, ...otherUsers];

    if (search && typeof search === "string" && search.trim().length > 0) {
      const searchLower = search.toLowerCase();
      return {
        collaborators: allUsers
          .filter(
            (user) =>
              user.name?.toLowerCase().includes(searchLower) ||
              user.email.toLowerCase().includes(searchLower)
          )
          .sort((a, b) => {
            const aNameMatch = a.name?.toLowerCase().startsWith(searchLower)
              ? 2
              : a.name?.toLowerCase().includes(searchLower)
                ? 1
                : 0;
            const bNameMatch = b.name?.toLowerCase().startsWith(searchLower)
              ? 2
              : b.name?.toLowerCase().includes(searchLower)
                ? 1
                : 0;

            if (aNameMatch !== bNameMatch) return bNameMatch - aNameMatch;

            const aEmailMatch = a.email.toLowerCase().startsWith(searchLower)
              ? 2
              : a.email.toLowerCase().includes(searchLower)
                ? 1
                : 0;
            const bEmailMatch = b.email.toLowerCase().startsWith(searchLower)
              ? 2
              : b.email.toLowerCase().includes(searchLower)
                ? 1
                : 0;

            if (aEmailMatch !== bEmailMatch) return bEmailMatch - aEmailMatch;
            return (b.projectCount || 0) - (a.projectCount || 0);
          })
          .slice(0, 10),
      };
    }

    return { collaborators: allUsers.slice(0, 10) };
  } else {
    return { collaborators: users };
  }
}

export async function getSharedProjects(userId: string, targetUserId: string) {
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  if (!targetUserId) {
    throw new AppError(
      400,
      "TARGET_USER_ID_REQUIRED",
      "Target User ID is required"
    );
  }

  // projects where the current user is a member
  const currentUserProjects = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });

  const currentUserProjectIds = currentUserProjects.map((p) => p.projectId);

  if (currentUserProjectIds.length === 0) {
    return {
      projects: [],
      count: 0,
    };
  }

  // projects where the target user is a member AND the current user is also a member
  const sharedProjectMembers = await prisma.projectMember.findMany({
    where: {
      userId: targetUserId as string,
      projectId: { in: currentUserProjectIds },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          _count: {
            select: {
              members: true,
            },
          },
        },
      },
    },
  });

  const sharedProjects = sharedProjectMembers.map((member) => ({
    id: member.project.id,
    name: member.project.name,
    description: member.project.description,
    status: member.project.status,
    memberCount: member.project._count.members,
    userRole: member.role,
  }));

  return {
    projects: sharedProjects,
    count: sharedProjects.length,
  };
}
