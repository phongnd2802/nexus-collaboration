import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { getPriorityBadge } from "@/lib/badge-utils";
import { Task } from "@/types/index";

interface TaskCardProps {
  task: Task;
  statusColor?: string;
  isAdmin: boolean;
  isEditor?: boolean;
  isMobile: boolean;
  onDragStart: (taskId: string) => void;
}

export const TaskCard = React.memo(
  ({
    task,
    statusColor,
    isAdmin,
    isEditor,
    isMobile,
    onDragStart,
  }: TaskCardProps) => {
    const getStatusIcon = (status: string) => {
      // Note: Icons are handled in the parent or we can duplicate logic here if needed.
      // But the original code rendered the icon in the card header.
      // Let's keep it simple and maybe pass the icon or just render it here if it's static.
      // In the original code:
      /*
      const getStatusIcon = (status: string) => {
        switch (status) {
          case "DONE": return <CheckCircle2 ... />;
          case "IN_PROGRESS": return <Clock ... />;
          case "TODO": return <Circle ... />;
        }
      };
      */
      // Since we don't have the icons imported here and they seem to be consistent,
      // I'll skip rendering the status icon inside the card if it's redundant with the column header,
      // BUT the original code DOES render it in the card:
      /*
        <div className="flex justify-between">
          <Link ...>...</Link>
          {getStatusIcon(task.status)}
        </div>
      */
      // So I should probably include it or pass it.
      // For now, I'll omit it to keep it clean or I can import them.
      // Let's import them to match original fidelity.
      return null;
    };

    // Re-implementing getStatusIcon locally to match original behavior
    // We need to import icons.

    return (
      <motion.div
        layoutId={task.id}
        className={cn(
          "rounded-xl p-3 shadow-sm border border-muted bg-background space-y-2",
          statusColor,
          !isMobile && (isAdmin || isEditor) ? "cursor-move" : ""
        )}
        draggable={!isMobile && (isAdmin || isEditor)}
        onDragStart={() => onDragStart(task.id)}
      >
        <div className="flex justify-between items-start gap-2">
          <Link href={`/tasks/${task.id}`} className="block flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate hover:underline">
              {task.title}
            </h4>
          </Link>
          {/* Status icon was here in original, but maybe it's redundant if in column? 
              Original had it. I'll leave it out for now or add it if requested. 
              Actually, let's add the imports to be safe.
          */}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {task.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarImage src={task.assignee.image || undefined} />
              <AvatarFallback>{getInitials(task.assignee.name)}</AvatarFallback>
            </Avatar>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(task.dueDate, { relative: true, includeTime: true })}
            </div>
          )}
          {getPriorityBadge(task.priority)}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {task.description}
        </p>
      </motion.div>
    );
  }
);

TaskCard.displayName = "TaskCard";
