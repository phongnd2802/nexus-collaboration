/**
 * Notes Share Modal
 * Share notes with workspace members (Google Docs-style with Viewer/Editor roles)
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useWorkspaceMembers } from '@/lib/api/workspace-api';
import { useAuth } from '@/contexts/AuthContext';
import { Search, UserPlus, Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { notesApi } from '@/lib/api/notes-api';
import { useIntl } from 'react-intl';
import type { Note } from '@/types/notes';

interface NotesShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  noteTitle: string;
  note?: Note;
  onNoteUpdated?: () => void;
}

export function NotesShareModal({
  isOpen,
  onClose,
  noteId,
  noteTitle,
  note,
  onNoteUpdated,
}: NotesShareModalProps) {
  const intl = useIntl();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sharedWith, setSharedWith] = useState<Set<string>>(new Set());
  const [permission, setPermission] = useState<'read' | 'write'>('write');
  const [isSharing, setIsSharing] = useState(false);
  const [updatingPermission, setUpdatingPermission] = useState<string | null>(null);
  const [removingUser, setRemovingUser] = useState<string | null>(null);

  // Fetch workspace members
  const { data: members = [], isLoading } = useWorkspaceMembers(workspaceId || '');

  // Current collaborators (already shared)
  const collaborators = note?.collaborators || [];
  const collaboratorIds = new Set(collaborators.map((c) => c.id));

  // Filter members: exclude self and already-shared users
  const filteredMembers = members.filter((member) => {
    if (member.user_id === user?.id) return false;
    if (collaboratorIds.has(member.user_id)) return false;
    const name = member.user?.name || member.user?.email || '';
    const email = member.user?.email || '';
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  const handleToggleShare = (userId: string) => {
    setSharedWith((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleShare = async () => {
    if (sharedWith.size === 0) {
      toast.error(intl.formatMessage({ id: 'modules.notes.shareModal.noMemberSelected' }));
      return;
    }
    if (!workspaceId) return;

    try {
      setIsSharing(true);
      const result = await notesApi.shareNote(workspaceId, noteId, {
        user_ids: Array.from(sharedWith),
        permission,
      });

      const sharedCount =
        typeof result === 'object' && result !== null && 'shared_count' in result
          ? result.shared_count
          : sharedWith.size;

      toast.success(
        intl.formatMessage(
          {
            id:
              sharedCount > 1
                ? 'modules.notes.shareModal.sharedSuccessPlural'
                : 'modules.notes.shareModal.sharedSuccess',
          },
          { title: noteTitle, count: sharedCount },
        ),
      );

      setSharedWith(new Set());
      setSearchQuery('');
      onNoteUpdated?.();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        intl.formatMessage({ id: 'modules.notes.shareModal.shareFailed' });
      toast.error(String(msg));
    } finally {
      setIsSharing(false);
    }
  };

  const handleUpdatePermission = async (targetUserId: string, newPermission: 'read' | 'write') => {
    if (!workspaceId) return;
    try {
      setUpdatingPermission(targetUserId);
      await notesApi.updateNotePermission(workspaceId, noteId, targetUserId, newPermission);
      toast.success(intl.formatMessage({ id: 'modules.notes.shareModal.permissionUpdated' }));
      onNoteUpdated?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || intl.formatMessage({ id: 'modules.notes.shareModal.permissionUpdateFailed' }));
    } finally {
      setUpdatingPermission(null);
    }
  };

  const handleRemoveUser = async (targetUserId: string) => {
    if (!workspaceId) return;
    try {
      setRemovingUser(targetUserId);
      await notesApi.unshareNote(noteId, targetUserId);
      toast.success(intl.formatMessage({ id: 'modules.notes.shareModal.userRemoved' }));
      onNoteUpdated?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || intl.formatMessage({ id: 'modules.notes.shareModal.userRemoveFailed' }));
    } finally {
      setRemovingUser(null);
    }
  };

  const getRoleLabel = (role: string) =>
    intl.formatMessage({ id: `projects.roles.${role}`, defaultMessage: role }, {});

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {intl.formatMessage({ id: 'modules.notes.shareModal.shareNote' }, { title: noteTitle })}
          </DialogTitle>
          <DialogDescription>
            {intl.formatMessage({ id: 'modules.notes.shareModal.shareWithMembers' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={intl.formatMessage({ id: 'modules.notes.shareModal.searchMembers' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Members List */}
          <ScrollArea className="h-[200px] rounded-md border">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">
                  {intl.formatMessage({ id: 'modules.notes.shareModal.loadingMembers' })}
                </p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">
                  {intl.formatMessage({ id: 'modules.notes.shareModal.noMembersFound' })}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredMembers.map((member) => {
                  const userId = member.user_id;
                  const isSelected = sharedWith.has(userId);
                  return (
                    <button
                      key={userId}
                      onClick={() => handleToggleShare(userId)}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user?.avatar} />
                        <AvatarFallback>
                          {member.user?.name?.charAt(0) || member.user?.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">
                          {member.user?.name || member.user?.email}
                        </p>
                        {member.user?.email && member.user?.name && (
                          <p className="text-xs text-muted-foreground">{member.user.email}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {getRoleLabel(member.role)}
                        </Badge>
                        {isSelected && (
                          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Permission Selector for new shares */}
          {sharedWith.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {intl.formatMessage({ id: 'modules.notes.shareModal.shareAs' })}
              </span>
              <Select
                value={permission}
                onValueChange={(v) => setPermission(v as 'read' | 'write')}
              >
                <SelectTrigger className="h-8 text-sm flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="write">Editor</SelectItem>
                  <SelectItem value="read">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSharing}>
              {intl.formatMessage({ id: 'modules.notes.shareModal.cancel' })}
            </Button>
            <Button onClick={handleShare} disabled={sharedWith.size === 0 || isSharing}>
              {isSharing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {intl.formatMessage({ id: 'modules.notes.shareModal.sharing' })}
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {intl.formatMessage({ id: 'modules.notes.shareModal.share' })}
                </>
              )}
            </Button>
          </div>

          {/* Current collaborators section */}
          {collaborators.length > 0 && (
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {intl.formatMessage({ id: 'modules.notes.shareModal.sharedWith' })}
              </p>
              {collaborators.map((collab) => (
                <div key={collab.id} className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={collab.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {collab.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{collab.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{collab.email}</p>
                  </div>
                  <Select
                    value={collab.permission}
                    onValueChange={(v) =>
                      handleUpdatePermission(collab.id, v as 'read' | 'write')
                    }
                    disabled={updatingPermission === collab.id}
                  >
                    <SelectTrigger className="h-7 w-28 text-xs">
                      {updatingPermission === collab.id ? (
                        <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="write">Editor</SelectItem>
                      <SelectItem value="read">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={removingUser === collab.id}
                    onClick={() => handleRemoveUser(collab.id)}
                  >
                    {removingUser === collab.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
