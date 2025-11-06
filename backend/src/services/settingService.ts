import { AppError } from "../utils/errors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getUserSetting(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
    },
    select: {
      id: true,
      // Collaboration Preferences
      autoAcceptTaskAssignments: true,
      taskReminderNotifications: true,
      showDueDatesInLocalTimezone: true,

      // Email Notifications
      emailProjectInvitations: true,
      emailTaskAssignments: true,
      emailTaskDueDateReminders: true,
      emailComments: true,

      // In-App Notifications
      inAppProjectUpdates: true,
      inAppRoleChanges: true,

      createdAt: true,
      updatedAt: true,
    },
  });

  return settings;
}

export async function updateUserSetting(userId: string, settingsData: any) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {
      // Collaboration Preferences
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

      // Email Notifications
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

      // In-App Notifications
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
      // Collaboration Preferences
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

      // Email Notifications
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

      // In-App Notifications
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
