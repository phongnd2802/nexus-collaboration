import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../ui/button'
import { Loader2, PenLine, Check } from 'lucide-react'
import { notesApi } from '@/lib/api/notes-api'
import { toast } from 'sonner'
import { useIntl } from 'react-intl'

interface RequestEditPermissionBannerProps {
  noteId: string
}

export function RequestEditPermissionBanner({ noteId }: RequestEditPermissionBannerProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const intl = useIntl()
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleRequest = async () => {
    if (!workspaceId || isLoading) return
    try {
      setIsLoading(true)
      await notesApi.requestPermissionChange(workspaceId, noteId, { permission: 'write' })
      setSent(true)
      toast.success(intl.formatMessage({ id: 'modules.notes.permissionBanner.requestSuccess' }))
    } catch (error: any) {
      const msg = error?.response?.data?.message || intl.formatMessage({ id: 'modules.notes.permissionBanner.requestFailed' })
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 mb-2 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground">
      <span>{intl.formatMessage({ id: 'modules.notes.permissionBanner.viewOnly' })}</span>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1.5"
        onClick={handleRequest}
        disabled={isLoading || sent}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : sent ? (
          <Check className="h-3 w-3" />
        ) : (
          <PenLine className="h-3 w-3" />
        )}
        {sent
          ? intl.formatMessage({ id: 'modules.notes.permissionBanner.requestSent' })
          : intl.formatMessage({ id: 'modules.notes.permissionBanner.requestEditAccess' })}
      </Button>
    </div>
  )
}
