import { z } from 'zod';

// Note: shapes below follow what dashboard.service.ts actually returns at runtime,
// not the (stale/mismatched) DashboardActivity/ActivityTrendPoint/TeamProductivityData/
// ProjectAnalyticsData interfaces in dashboard.dto.ts.

export const dashboardActivityOutputSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  description: z.string().optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
  userAvatar: z.string().optional(),
  workspaceId: z.string().optional(),
  timestamp: z.string().optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const activityTrendPointOutputSchema = z.object({
  date: z.string(),
  tasks: z.number().optional(),
  messages: z.number().optional(),
  files: z.number().optional(),
  meetings: z.number().optional(),
  notes: z.number().optional(),
  activeUsers: z.number().optional(),
}).passthrough();

export const teamProductivityMemberOutputSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  userAvatar: z.string().optional(),
  role: z.string().optional(),
  tasksCompleted: z.number().optional(),
  tasksAssigned: z.number().optional(),
  completionRate: z.number().optional(),
  averageTaskTime: z.number().optional(),
  messagesCount: z.number().optional(),
  filesShared: z.number().optional(),
  lastActive: z.string().optional(),
  productivityScore: z.number().optional(),
}).passthrough();

export const projectAnalyticsItemOutputSchema = z.object({
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  status: z.string().optional(),
  progress: z.number().optional(),
  totalTasks: z.number().optional(),
  completedTasks: z.number().optional(),
  overdueTasks: z.number().optional(),
  teamSize: z.number().optional(),
  startDate: z.union([z.string(), z.unknown()]).optional(),
  endDate: z.string().optional(),
  completionRate: z.number().optional(),
  averageTaskCompletionTime: z.number().optional(),
  riskLevel: z.string().optional(),
  lastActivity: z.string().optional(),
}).passthrough();

export const dashboardMetricsOutputSchema = z.object({
  summary: z.object({
    totalProjects: z.number(),
    activeProjects: z.number(),
    totalTasks: z.number(),
    completedTasks: z.number(),
    pendingTasks: z.number(),
    totalTeamMembers: z.number(),
    activeTeamMembers: z.number(),
    totalMessages: z.number(),
    totalEvents: z.number(),
    totalFiles: z.number(),
    totalVideoCalls: z.number(),
    storageUsed: z.number(),
    integrations: z.number(),
  }).passthrough(),
  today: z.object({
    messagesCount: z.number(),
    filesUploaded: z.number(),
    tasksCompleted: z.number(),
    videoCallsCount: z.number(),
  }).passthrough(),
  productivity: z.object({
    tasksCompletedToday: z.number(),
    tasksCompletedThisWeek: z.number(),
    tasksCompletedThisMonth: z.number(),
    averageTaskCompletionTime: z.number(),
    projectCompletionRate: z.number(),
  }).passthrough(),
  engagement: z.object({
    messagesPerDay: z.number(),
    filesSharedPerDay: z.number(),
    activeUsersToday: z.number(),
    activeUsersThisWeek: z.number(),
    meetingsScheduled: z.number(),
  }).passthrough(),
  trends: z.object({
    taskCompletionTrend: z.number(),
    teamEngagementTrend: z.number(),
    projectProgressTrend: z.number(),
  }).passthrough(),
}).passthrough();

export const dashboardOutputSchema = z.object({
  metrics: dashboardMetricsOutputSchema,
  recentActivity: z.object({
    activities: z.array(dashboardActivityOutputSchema),
    total: z.number(),
    hasMore: z.boolean(),
  }).passthrough(),
  activityTrend: z.object({
    data: z.array(activityTrendPointOutputSchema),
    period: z.string(),
    summary: z.record(z.unknown()),
  }).passthrough(),
  teamProductivity: z.object({
    members: z.array(teamProductivityMemberOutputSchema),
    teamStats: z.record(z.unknown()),
    topPerformers: z.array(z.unknown()),
  }).passthrough(),
  projectAnalytics: z.object({
    projects: z.array(projectAnalyticsItemOutputSchema),
    summary: z.record(z.unknown()),
    trends: z.record(z.unknown()),
  }).passthrough(),
  dateRange: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
});
