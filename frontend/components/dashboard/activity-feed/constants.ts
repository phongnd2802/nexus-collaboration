import {
  CheckCircle,
  Clock,
  FileText,
  Plus,
  UserPlus,
  Users,
  LucideIcon,
} from "lucide-react";

export interface ActivityConfigItem {
  icon: LucideIcon;
  colorClass: string;
}

export const ACTIVITY_CONFIG: Record<string, ActivityConfigItem> = {
  PROJECT_CREATED: { icon: Plus, colorClass: "text-emerald-500" },
  MEMBER_ADDED: { icon: UserPlus, colorClass: "text-blue-500" },
  TASK_CREATED: {
    icon: FileText,
    colorClass: "text-violet-500 dark:text-violet-400",
  },
  TASK_UPDATED: { icon: Clock, colorClass: "text-amber-500" },
  TASK_COMPLETED: { icon: CheckCircle, colorClass: "text-green-500" },
  PROJECT_UPDATED: { icon: Users, colorClass: "text-indigo-500" },
  DEFAULT: {
    icon: FileText,
    colorClass: "text-violet-500 dark:text-violet-400",
  },
};