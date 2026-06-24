/**
 * NoteAccessDenied
 * Shown when a user tries to access a note they don't have permission to view.
 * Provides a UI to send an access request to the note owner.
 */

import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { Lock, Send, CheckCircle, XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { notesApi } from '@/lib/api/notes-api';

interface NoteAccessDeniedProps {
  noteId: string;
  noteTitle: string;
  ownerId: string;
  workspaceId: string;
  onBack?: () => void;
}

type RequestState = 'idle' | 'sending' | 'sent' | 'already_pending' | 'approved' | 'denied' | 'error';

export function NoteAccessDenied({
  noteId,
  noteTitle,
  ownerId,
  workspaceId,
  onBack,
}: NoteAccessDeniedProps) {
  const intl = useIntl();
  const [requestState, setRequestState] = useState<RequestState>('idle');
  const [message, setMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [requestedPermission, setRequestedPermission] = useState<'read' | 'write'>('read');

  // Check if there's already a pending/approved/denied request
  useEffect(() => {
    let cancelled = false;
    notesApi.getNoteAccessStatus(workspaceId, noteId).then((status) => {
      if (cancelled || !status) return;
      if (status.status === 'pending') setRequestState('already_pending');
      else if (status.status === 'approved') setRequestState('approved');
      else if (status.status === 'denied') setRequestState('idle'); // allow re-send after deny
    }).catch(() => {/* non-fatal */});
    return () => { cancelled = true; };
  }, [noteId, workspaceId]);

  const handleSendRequest = () => {
    setRequestState('sent');
    toast.success(
      intl.formatMessage(
        { id: 'modules.notes.accessDenied.requestSentToast' },
        { title: noteTitle },
      ),
    );

    // Call API in the background
    notesApi.requestNoteAccess(workspaceId, noteId, {
      message: message.trim() || undefined,
      requested_permission: requestedPermission,
    })
      .catch((err: any) => {
        console.error('Failed to send access request in background:', err);
        const msg = err?.response?.data?.message || err?.message || '';
        if (msg.toLowerCase().includes('pending')) {
          setRequestState('already_pending');
        } else {
          setRequestState('idle');
          toast.error(intl.formatMessage({ id: 'modules.notes.accessDenied.requestFailed' }));
        }
      });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      {/* Icon */}
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
        {requestState === 'sent' || requestState === 'already_pending' ? (
          <CheckCircle className="w-10 h-10 text-blue-500" />
        ) : requestState === 'approved' ? (
          <CheckCircle className="w-10 h-10 text-green-500" />
        ) : requestState === 'denied' ? (
          <XCircle className="w-10 h-10 text-red-500" />
        ) : (
          <Lock className="w-10 h-10 text-muted-foreground" />
        )}
      </div>

      {/* Title */}
      <h2 className="text-2xl font-semibold mb-2">
        {requestState === 'sent' || requestState === 'already_pending'
          ? intl.formatMessage({ id: 'modules.notes.accessDenied.requestSent' })
          : requestState === 'approved'
          ? intl.formatMessage({ id: 'modules.notes.accessDenied.requestApproved' })
          : requestState === 'denied'
          ? intl.formatMessage({ id: 'modules.notes.accessDenied.requestDenied' })
          : intl.formatMessage({ id: 'modules.notes.accessDenied.title' })}
      </h2>

      {/* Subtitle */}
      <p className="text-muted-foreground mb-1 max-w-md">
        {requestState === 'sent' || requestState === 'already_pending'
          ? intl.formatMessage({ id: 'modules.notes.accessDenied.requestPending' })
          : requestState === 'approved'
          ? intl.formatMessage({ id: 'modules.notes.accessDenied.approvedHint' })
          : requestState === 'denied'
          ? intl.formatMessage({ id: 'modules.notes.accessDenied.deniedHint' })
          : intl.formatMessage(
              { id: 'modules.notes.accessDenied.message' },
              { title: noteTitle },
            )}
      </p>

      {/* Ask to request? */}
      {(requestState === 'idle' || requestState === 'error' || requestState === 'sending') && (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {intl.formatMessage({ id: 'modules.notes.accessDenied.askRequest' })}
          </p>

          {/* Permission selector */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm text-muted-foreground">
              {intl.formatMessage({ id: 'modules.notes.accessDenied.requestAs' })}:
            </span>
            <div className="flex gap-1 p-1 bg-muted rounded-md">
              <button
                className={`px-3 py-1 text-sm rounded transition-colors ${requestedPermission === 'read' ? 'bg-primary text-primary-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setRequestedPermission('read')}
              >
                {intl.formatMessage({ id: 'modules.notes.accessDenied.viewer' })}
              </button>
              <button
                className={`px-3 py-1 text-sm rounded transition-colors ${requestedPermission === 'write' ? 'bg-primary text-primary-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setRequestedPermission('write')}
              >
                {intl.formatMessage({ id: 'modules.notes.accessDenied.editor' })}
              </button>
            </div>
          </div>

          {/* Optional message input */}
          {showMessageInput ? (
            <div className="w-full max-w-sm mb-4">
              <Textarea
                id="access-request-message"
                placeholder={intl.formatMessage({ id: 'modules.notes.accessDenied.messagePlaceholder' })}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="resize-none mb-3"
                maxLength={300}
              />
            </div>
          ) : (
            <button
              className="text-sm text-primary underline underline-offset-2 mb-4 hover:opacity-80 transition-opacity"
              onClick={() => setShowMessageInput(true)}
            >
              {intl.formatMessage({ id: 'modules.notes.accessDenied.addMessage' })}
            </button>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {onBack && (
              <Button variant="outline" onClick={onBack} id="note-access-denied-back-btn">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'modules.notes.accessDenied.cancel' })}
              </Button>
            )}
            <Button
              id="note-access-denied-request-btn"
              onClick={handleSendRequest}
              disabled={requestState === 'sending'}
            >
              {requestState === 'sending' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {intl.formatMessage({ id: 'modules.notes.accessDenied.sending' })}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {intl.formatMessage({ id: 'modules.notes.accessDenied.sendRequest' })}
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* Pending state buttons */}
      {(requestState === 'sent' || requestState === 'already_pending') && onBack && (
        <Button variant="outline" className="mt-6" onClick={onBack} id="note-access-pending-back-btn">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {intl.formatMessage({ id: 'modules.notes.accessDenied.goBack' })}
        </Button>
      )}

      {/* Approved state */}
      {requestState === 'approved' && onBack && (
        <Button className="mt-6" onClick={onBack} id="note-access-approved-back-btn">
          {intl.formatMessage({ id: 'modules.notes.accessDenied.goBack' })}
        </Button>
      )}

      {/* Denied state: allow re-send */}
      {requestState === 'denied' && (
        <div className="flex gap-3 mt-6">
          {onBack && (
            <Button variant="outline" onClick={onBack} id="note-access-denied-go-back-btn">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {intl.formatMessage({ id: 'modules.notes.accessDenied.goBack' })}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
