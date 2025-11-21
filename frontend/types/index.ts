export interface User {
  id: string;
  name: string | null;
  image: string | null;
  email?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: "IN_PROGRESS" | "AT_RISK" | "COMPLETED";
  dueDate: string | null;
  createdAt?: string;
  updatedAt?: string;
  ownerId?: string;
  creatorId?: string;
  creator?: User | null;
  memberCount?: number;
}

export interface ProjectWithDetails extends Project {
  members: ProjectMember[];
  memberCount?: number;
  completionPercentage?: number;
}

export interface Activity {
  id: string;
  type:
    | "PROJECT_CREATED"
    | "PROJECT_UPDATED"
    | "TASK_CREATED"
    | "TASK_UPDATED"
    | "TASK_COMPLETED"
    | "MEMBER_ADDED";
  projectId: string;
  projectName: string;
  userId: string;
  userName: string | null;
  userImage: string | null;
  userEmail: string;
  createdAt: string;
  entityId?: string | null;
  entityTitle?: string | null;
  targetUser?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  details?: {
    status?: string;
    oldStatus?: string;
    newStatus?: string;
    role?: string;
  } | null;
}

export interface TaskFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  isTaskDeliverable: boolean;
  uploadedAt?: string;
}

export interface Subtask {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  assigneeId?: string | null;
  assignee?: User | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LinkedTask {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  assignee?: User | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string | null;
  projectId: string;
  project?: {
    id: string;
    name: string;
  };
  assigneeId?: string | null;
  assignee?: User | null;
  creatorId?: string;
  creator?: User | null;
  createdAt?: string;
  updatedAt?: string;
  taskFiles?: TaskFile[];
  subtasks?: Subtask[];
  linkedTasks?: LinkedTask[];
  completionNote?: string | null;
}

export interface ProjectMember {
  userId: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  user: User;
}

export interface CalendarEvent {
  title: string;
  start: string | Date;
  type: string;
  color?: string;
  projectId?: string;
  taskId?: string;
}

export interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  type: "project" | "task";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  project: {
    id: string;
    name: string;
  };
  assignee?: {
    name: string;
    image: string | null;
  };
  description?: string | null;
}

export interface FileAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface PendingInvitation {
  id: string;
  projectId: string;
  role: string;
  expiresAt: string;
  projectName: string;
  inviterName: string;
}

export type InvitationActionType = "Accept" | "Decline" | null;

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface Conversation {
  // Common fields
  lastMessageAt: string;
  lastMessageContent: string;
  unreadCount: number;

  // Direct message specific fields
  userId?: string;
  user?: User;

  // Team chat specific fields
  projectId?: string;
  isTeamChat?: boolean;
  name?: string;
  description?: string;
  creator?: string;
  memberCount?: number;
  lastMessageSender?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

export type Locale = "en" | "vi";