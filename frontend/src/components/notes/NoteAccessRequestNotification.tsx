/**
 * NoteAccessRequestNotification
 * Inline action buttons rendered inside a notification card when the notification
 * type is 'note_access_request'. Allows the owner to approve or deny directly.
 */

import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { notesApi } from '@/lib/api/notes-api';

interface NoteAccessRequestNotificationProps {
  requestId: string;
  workspaceId: string;
  requesterName: string;
  noteTitle: string;
  onResponded?: (action: 'approve' | 'deny') => void;
}

export function NoteAccessRequestNotification({
  requestId,
  workspaceId,
  requesterName,
  noteTitle,
  onResponded,
}: NoteAccessRequestNotificationProps) {
  const intl = useIntl();
  const [state, setState] = useState<'idle' | 'approving' | 'denying' | 'approved' | 'denied' | 'invalid'>('idle');

  React.useEffect(() => {
    let cancelled = false;
    notesApi.getAccessRequestById(workspaceId, requestId)
      .then((request) => {
        if (cancelled) return;
        if (request.status === 'approved') setState('approved');
        else if (request.status === 'denied') setState('denied');
      })
      .catch((err) => {
        console.error('Failed to fetch access request status on notification mount:', err);
        if (cancelled) return;
        const status = err?.response?.status || err?.status || err?.statusCode;
        if (status === 404) {
          setState('invalid');
        }
      });
    return () => { cancelled = true; };
  }, [workspaceId, requestId]);

  const handleRespond = (action: 'approve' | 'deny') => {
    setState(action === 'approve' ? 'approved' : 'denied');
    toast.success(
      action === 'approve'
        ? intl.formatMessage(
            { id: 'modules.notes.accessRequest.approvedMessage' },
            { requester: requesterName },
          )
        : intl.formatMessage(
            { id: 'modules.notes.accessRequest.deniedMessage' },
            { requester: requesterName },
          ),
    );
    onResponded?.(action);

    // Call API in the background
    notesApi.respondToNoteAccess(workspaceId, requestId, action)
      .catch((err: any) => {
        console.error('Failed to respond to note access in background:', err);
        setState('idle');
        const msg = err?.response?.data?.message || err?.message;
        toast.error(msg || intl.formatMessage({ id: 'modules.notes.accessRequest.respondFailed' }));
      });
  };

  if (state === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium mt-2">
        <CheckCircle className="w-4 h-4" />
        {intl.formatMessage({ id: 'modules.notes.accessRequest.alreadyApproved' })}
      </span>
    );
  }

  if (state === 'denied') {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground font-medium mt-2">
        <XCircle className="w-4 h-4" />
        {intl.formatMessage({ id: 'modules.notes.accessRequest.alreadyDenied' })}
      </span>
    );
  }

  if (state === 'invalid') {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground font-medium mt-2">
        <XCircle className="w-4 h-4" />
        {intl.formatMessage({ id: 'modules.notes.accessRequest.invalid', defaultMessage: 'Yêu cầu không còn hiệu lực' })}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <Button
        id={`note-access-approve-${requestId}`}
        size="sm"
        onClick={() => handleRespond('approve')}
        disabled={state !== 'idle'}
        className="h-7 text-xs"
      >
        {state === 'approving' ? (
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        ) : (
          <CheckCircle className="w-3 h-3 mr-1" />
        )}
        {intl.formatMessage({ id: 'modules.notes.accessRequest.approve' })}
      </Button>
      <Button
        id={`note-access-deny-${requestId}`}
        size="sm"
        variant="outline"
        onClick={() => handleRespond('deny')}
        disabled={state !== 'idle'}
        className="h-7 text-xs"
      >
        {state === 'denying' ? (
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        ) : (
          <XCircle className="w-3 h-3 mr-1" />
        )}
        {intl.formatMessage({ id: 'modules.notes.accessRequest.deny' })}
      </Button>
    </div>
  );
}
