/**
 * Share Modal
 * Share files with workspace members OR create public shareable links
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { useWorkspaceMembers } from '@/lib/api/workspace-api';
import { fileApi } from '@/lib/api/files-api';
import type { ShareLinkResponse } from '@/lib/api/files-api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search,
  UserPlus,
  Check,
  Loader2,
  Link2,
  Copy,
  Eye,
  Download,
  Edit3,
  Lock,
  Calendar,
  Hash,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
}

export function ShareModal({
  isOpen,
  onClose,
  fileId,
  fileName,
}: ShareModalProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const intl = useIntl();

  const t = (id: string, values?: Record<string, any>) =>
    intl.formatMessage({ id: `modules.files.share.${id}` }, values);

  // Members sharing state
  const [searchQuery, setSearchQuery] = useState('');
  const [sharedWith, setSharedWith] = useState<Set<string>>(new Set());
  const [isSharing, setIsSharing] = useState(false);

  // Link sharing state
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [shareLinks, setShareLinks] = useState<ShareLinkResponse[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New link options
  const [accessLevel, setAccessLevel] = useState<'view' | 'download' | 'edit'>('view');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [useExpiration, setUseExpiration] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [useDownloadLimit, setUseDownloadLimit] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState(10);

  // Fetch workspace members
  const { data: members = [], isLoading: isLoadingMembers } = useWorkspaceMembers(workspaceId || '');

  // Fetch existing share links
  useEffect(() => {
    if (isOpen && workspaceId && fileId) {
      fetchShareLinks();
    }
  }, [isOpen, workspaceId, fileId]);

  const fetchShareLinks = async () => {
    if (!workspaceId) return;
    setIsLoadingLinks(true);
    try {
      const links = await fileApi.getFileShareLinks(workspaceId, fileId);
      setShareLinks(links);
    } catch (error) {
      console.error('Failed to fetch share links:', error);
    } finally {
      setIsLoadingLinks(false);
    }
  };

  // Filter members based on search query and exclude current user
  const filteredMembers = members.filter(member => {
    if (member.user_id === user?.id) return false;
    const userName = member.user?.name || member.user?.email || '';
    const userEmail = member.user?.email || '';
    const query = searchQuery.toLowerCase();
    return userName.toLowerCase().includes(query) || userEmail.toLowerCase().includes(query);
  });

  const handleToggleShare = (userId: string) => {
    setSharedWith(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleShareWithMembers = async () => {
    if (sharedWith.size === 0) {
      toast.error(t('toastSelectMember'));
      return;
    }

    if (!workspaceId) {
      toast.error(t('toastWorkspaceNotFound'));
      return;
    }

    try {
      setIsSharing(true);
      const result = await fileApi.shareFile({
        workspaceId,
        fileId,
        userIds: Array.from(sharedWith),
        permissions: { read: true, download: true, edit: false },
      });

      const count = result.shared_count;
      toast.success(t('toastSharedSuccess', { fileName, count, plural: count > 1 ? 's' : '' }));
      setSharedWith(new Set());
      setSearchQuery('');
    } catch (error: any) {
      console.error('Failed to share file:', error);
      toast.error(error?.response?.data?.message || t('toastShareFailed'));
    } finally {
      setIsSharing(false);
    }
  };

  const handleCreateLink = async () => {
    if (!workspaceId) {
      toast.error(t('toastWorkspaceNotFound'));
      return;
    }

    setIsCreatingLink(true);
    try {
      const newLink = await fileApi.createShareLink(workspaceId, fileId, {
        accessLevel,
        password: usePassword ? password : undefined,
        expiresAt: useExpiration ? expiresAt : undefined,
        maxDownloads: useDownloadLimit ? maxDownloads : undefined,
      });

      setShareLinks([newLink, ...shareLinks]);
      toast.success(t('toastLinkCreated'));

      await navigator.clipboard.writeText(newLink.shareUrl);
      setCopiedId(newLink.id);
      toast.success(t('toastLinkCopied'));
      setTimeout(() => setCopiedId(null), 2000);

      // Reset form
      setAccessLevel('view');
      setUsePassword(false);
      setPassword('');
      setUseExpiration(false);
      setExpiresAt('');
      setUseDownloadLimit(false);
      setMaxDownloads(10);
    } catch (error: any) {
      console.error('Failed to create share link:', error);
      toast.error(error?.response?.data?.message || t('toastShareFailed'));
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleCopyLink = async (link: ShareLinkResponse) => {
    try {
      await navigator.clipboard.writeText(link.shareUrl);
      setCopiedId(link.id);
      toast.success(t('toastLinkCopied'));
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error(t('toastCopyFailed'));
    }
  };

  const handleDeleteLink = async (shareId: string) => {
    if (!workspaceId) return;

    try {
      await fileApi.deleteShareLink(workspaceId, shareId);
      setShareLinks(shareLinks.filter(link => link.id !== shareId));
      toast.success(t('toastLinkDeleted'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('toastDeleteLinkFailed'));
    }
  };

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case 'view': return <Eye className="h-3 w-3" />;
      case 'download': return <Download className="h-3 w-3" />;
      case 'edit': return <Edit3 className="h-3 w-3" />;
      default: return <Eye className="h-3 w-3" />;
    }
  };

  const getAccessLevelLabel = (level: string) => {
    switch (level) {
      case 'view': return t('accessLevelView');
      case 'download': return t('accessLevelDownload');
      case 'edit': return t('accessLevelEdit');
      default: return level;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title', { fileName })}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              {t('tabLink')}
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('tabMembers')}
            </TabsTrigger>
          </TabsList>

          {/* Get Link Tab */}
          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-3 p-3 rounded-lg border bg-muted/50">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t('accessLevel')}</Label>
                <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as any)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" /> {t('viewOnly')}
                      </div>
                    </SelectItem>
                    <SelectItem value="download">
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4" /> {t('canDownload')}
                      </div>
                    </SelectItem>
                    <SelectItem value="edit">
                      <div className="flex items-center gap-2">
                        <Edit3 className="h-4 w-4" /> {t('canEdit')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <Lock className="h-4 w-4" /> {t('password')}
                </span>
                <Switch checked={usePassword} onCheckedChange={setUsePassword} />
              </div>
              {usePassword && (
                <Input
                  type="password"
                  placeholder={t('passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-8"
                />
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> {t('expiration')}
                </span>
                <Switch checked={useExpiration} onCheckedChange={setUseExpiration} />
              </div>
              {useExpiration && (
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="h-8"
                />
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <Hash className="h-4 w-4" /> {t('downloadLimit')}
                </span>
                <Switch checked={useDownloadLimit} onCheckedChange={setUseDownloadLimit} />
              </div>
              {useDownloadLimit && (
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={maxDownloads}
                  onChange={(e) => setMaxDownloads(parseInt(e.target.value) || 10)}
                  className="h-8"
                />
              )}

              <Button
                onClick={handleCreateLink}
                disabled={isCreatingLink || (usePassword && !password)}
                className="w-full"
              >
                {isCreatingLink ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('creating')}
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    {t('createCopyLink')}
                  </>
                )}
              </Button>
            </div>

            {shareLinks.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('activeLinks', { count: shareLinks.length })}
                </Label>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-2">
                    {shareLinks.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-2 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            {getAccessLevelIcon(link.accessLevel)}
                            {getAccessLevelLabel(link.accessLevel)}
                          </Badge>
                          {link.hasPassword && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {t('views', { count: link.viewCount })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleCopyLink(link)}
                          >
                            {copiedId === link.id ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteLink(link.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[250px] rounded-md border">
              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">{t('noMembersFound')}</p>
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
                          <Badge variant="secondary" className="text-xs">{member.role}</Badge>
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

            {sharedWith.size > 0 && (
              <p className="text-sm text-muted-foreground">
                {t('memberSelected', { count: sharedWith.size, plural: sharedWith.size > 1 ? 's' : '' })}
              </p>
            )}

            <Button
              onClick={handleShareWithMembers}
              disabled={sharedWith.size === 0 || isSharing}
              className="w-full"
            >
              {isSharing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('sharing')}
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('shareWithMembers')}
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
