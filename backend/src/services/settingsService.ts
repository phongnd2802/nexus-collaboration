import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getUserSettingsService(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: { code: 404, message: "User not found" } };

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (settings) return settings;

  const projectCount = await prisma.project.count({
    where: { OR: [{ creatorId: userId }, { members: { some: { userId } } }] },
  });

  return {
    id: null,
    userId,
    autoAcceptTaskAssignments: false,
    taskReminderNotifications: true,
    showDueDatesInLocalTimezone: true,
    emailProjectInvitations: true,
    emailTaskAssignments: true,
    emailTaskDueDateReminders: true,
    emailComments: true,
    inAppProjectUpdates: true,
    inAppRoleChanges: true,
    projectCount,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;
}

export async function upsertUserSettingsService(userId: string, settingsData: any) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: { code: 404, message: "User not found" } };

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {
      autoAcceptTaskAssignments:
        settingsData.autoAcceptTaskAssignments !== undefined
          ? settingsData.autoAcceptTaskAssignments
          : undefined,
      taskReminderNotifications:
        settingsData.taskReminderNotifications !== undefined
          ? settingsData.taskReminderNotifications
          : undefined,
      showDueDatesInLocalTimezone:
        settingsData.showDueDatesInLocalTimezone !== undefined
          ? settingsData.showDueDatesInLocalTimezone
          : undefined,
      emailProjectInvitations:
        settingsData.emailProjectInvitations !== undefined
          ? settingsData.emailProjectInvitations
          : undefined,
      emailTaskAssignments:
        settingsData.emailTaskAssignments !== undefined
          ? settingsData.emailTaskAssignments
          : undefined,
      emailTaskDueDateReminders:
        settingsData.emailTaskDueDateReminders !== undefined
          ? settingsData.emailTaskDueDateReminders
          : undefined,
      emailComments:
        settingsData.emailComments !== undefined
          ? settingsData.emailComments
          : undefined,
      inAppProjectUpdates:
        settingsData.inAppProjectUpdates !== undefined
          ? settingsData.inAppProjectUpdates
          : undefined,
      inAppRoleChanges:
        settingsData.inAppRoleChanges !== undefined
          ? settingsData.inAppRoleChanges
          : undefined,
    },
    create: {
      userId,
      autoAcceptTaskAssignments:
        settingsData.autoAcceptTaskAssignments !== undefined
          ? settingsData.autoAcceptTaskAssignments
          : true,
      taskReminderNotifications:
        settingsData.taskReminderNotifications !== undefined
          ? settingsData.taskReminderNotifications
          : true,
      showDueDatesInLocalTimezone:
        settingsData.showDueDatesInLocalTimezone !== undefined
          ? settingsData.showDueDatesInLocalTimezone
          : true,
      emailProjectInvitations:
        settingsData.emailProjectInvitations !== undefined
          ? settingsData.emailProjectInvitations
          : true,
      emailTaskAssignments:
        settingsData.emailTaskAssignments !== undefined
          ? settingsData.emailTaskAssignments
          : true,
      emailTaskDueDateReminders:
        settingsData.emailTaskDueDateReminders !== undefined
          ? settingsData.emailTaskDueDateReminders
          : true,
      emailComments:
        settingsData.emailComments !== undefined
          ? settingsData.emailComments
          : true,
      inAppProjectUpdates:
        settingsData.inAppProjectUpdates !== undefined
          ? settingsData.inAppProjectUpdates
          : true,
      inAppRoleChanges:
        settingsData.inAppRoleChanges !== undefined
          ? settingsData.inAppRoleChanges
          : true,
    },
  });

  return settings;
}

