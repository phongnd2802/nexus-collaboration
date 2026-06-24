import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { notesApi } from '@/lib/api/notes-api';

interface NotePermissionChangeNotificationProps {
  noteId: string;
  workspaceId: string;
  requesterId: string;
  requesterName: string;
  noteTitle: string;
  initialResponse?: 'approved' | 'denied';
  onResponded?: (action: 'approve' | 'deny') => void;
}

export function NotePermissionChangeNotification({
  noteId,
  workspaceId,
  requesterId,
  requesterName,
  noteTitle,
  initialResponse,
  onResponded,
}: NotePermissionChangeNotificationProps) {
  const intl = useIntl();
  const [state, setState] = useState<'idle' | 'loading' | 'approved' | 'denied'>(
    initialResponse === 'approved' ? 'approved' : initialResponse === 'denied' ? 'denied' : 'idle'
  );

  const handleRespond = (action: 'approve' | 'deny') => {
    setState('loading');
    notesApi.respondPermissionChangeRequest(workspaceId, noteId, requesterId, action)
      .then(() => {
        setState(action === 'approve' ? 'approved' : 'denied');
        toast.success(
          action === 'approve'
            ? intl.formatMessage(
                { id: 'modules.notes.permissionChangeRequest.approvedMessage' },
                { requester: requesterName, permission: 'Editor' },
              )
            : intl.formatMessage(
                { id: 'modules.notes.permissionChangeRequest.deniedMessage' },
                { requester: requesterName },
              ),
        );
        onResponded?.(action);
        // Notify note view to refresh collaborative data
        window.dispatchEvent(new CustomEvent('note:permission-changed', { detail: { noteId } }));
      })
      .catch((err: any) => {
        setState('idle');
        const msg = err?.response?.data?.message || err?.message;
        toast.error(msg || intl.formatMessage({ id: 'modules.notes.permissionChangeRequest.respondFailed' }));
      });
  };

  if (state === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium mt-2">
        <CheckCircle className="w-4 h-4" />
        {intl.formatMessage({ id: 'modules.notes.permissionChangeRequest.alreadyApproved' })}
      </span>
    );
  }

  if (state === 'denied') {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground font-medium mt-2">
        <XCircle className="w-4 h-4" />
        {intl.formatMessage({ id: 'modules.notes.permissionChangeRequest.alreadyDenied' })}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <Button
        size="sm"
        onClick={() => handleRespond('approve')}
        disabled={state === 'loading'}
        className="h-7 text-xs"
      >
        {state === 'loading' ? (
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        ) : (
          <CheckCircle className="w-3 h-3 mr-1" />
        )}
        {intl.formatMessage({ id: 'modules.notes.permissionChangeRequest.approve' })}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleRespond('deny')}
        disabled={state === 'loading'}
        className="h-7 text-xs"
      >
        {state === 'loading' ? (
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        ) : (
          <XCircle className="w-3 h-3 mr-1" />
        )}
        {intl.formatMessage({ id: 'modules.notes.permissionChangeRequest.deny' })}
      </Button>
    </div>
  );
}
