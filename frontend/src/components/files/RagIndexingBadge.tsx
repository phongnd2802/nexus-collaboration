import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileRagStatus } from '@/lib/api/files-api';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RagIndexingBadgeProps {
  workspaceId: string;
  fileId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  showBackground?: boolean;
}

const sizeClasses = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

export function RagIndexingBadge({
  workspaceId,
  fileId,
  className,
  size = 'sm',
  showTooltip = true,
  showBackground = false,
}: RagIndexingBadgeProps) {
  const { data: status } = useFileRagStatus(workspaceId, fileId, {
    enabled: !!workspaceId && !!fileId,
  });

  if (!status || status.status === 'indexed' || status.status === 'deleted') {
    return null;
  }

  const iconClass = cn(sizeClasses[size], className);
  const icon =
    status.status === 'queued' || status.status === 'processing' ? (
      <Loader2 className={cn(iconClass, 'animate-spin text-blue-400')} />
    ) : (
      <AlertCircle className={cn(iconClass, 'text-amber-400')} />
    );

  const tooltipText =
    status.status === 'queued' || status.status === 'processing'
      ? 'Indexing...'
      : status.status === 'failed'
        ? status.error_message || 'Indexing failed'
        : 'Not indexed';

  const badgeContent = showBackground ? (
    <span className="inline-flex items-center justify-center w-4 h-4 bg-slate-700 rounded-full shadow-sm">
      {icon}
    </span>
  ) : (
    icon
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">{badgeContent}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
