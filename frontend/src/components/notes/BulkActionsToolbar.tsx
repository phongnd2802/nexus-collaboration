'use client'

import { useIntl } from 'react-intl'

import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Archive, ArchiveRestore, Trash2, X, Star, StarOff, Undo2 } from 'lucide-react'

interface BulkActionsToolbarProps {
  selectedCount: number
  onAction: (action: 'delete' | 'archive' | 'unarchive' | 'favorite' | 'unfavorite' | 'restore') => void
  onClear: () => void
  selectedNotes?: any[] // To determine note states
  isTrashView?: boolean // Whether we're in trash view
  canDelete?: boolean // Whether current user owns all selected notes (controls delete buttons)
}

export function BulkActionsToolbar({ selectedCount, onAction, onClear, selectedNotes = [], isTrashView = false, canDelete = true }: BulkActionsToolbarProps) {
  const intl = useIntl()
  // Check note states
  const hasFavorited = selectedNotes.some(note => note?.isFavorite)
  const hasUnfavorited = selectedNotes.some(note => !note?.isFavorite)
  const hasArchived = selectedNotes.some(note => note?.isArchived)
  const hasUnarchived = selectedNotes.some(note => !note?.isArchived)

  return (
    <div className="h-14 bg-background/90 backdrop-blur-xl border-b border-border flex items-center justify-between px-6 z-30">
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="text-base px-3 py-1">
          {selectedCount} {intl.formatMessage({ id: "modules.notes.bulkActions.selected" }, { count: selectedCount })}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        {isTrashView ? (
          // Actions for deleted notes (trash view) - only the owner can restore or permanently delete
          canDelete && (
            <>
              <Button variant="outline" size="sm" onClick={() => onAction('restore')}>
                <Undo2 className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: "modules.notes.bulkActions.restore" }, { count: selectedCount })}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onAction('delete')}>
                <Trash2 className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: "modules.notes.bulkActions.deletePermanently" })}
              </Button>
            </>
          )
        ) : (
          // Actions for active notes
          <>
            {/* Favorite/Unfavorite Actions */}
            {hasUnfavorited && (
              <Button variant="outline" size="sm" onClick={() => onAction('favorite')}>
                <Star className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: "modules.notes.bulkActions.favorite" })}
              </Button>
            )}
            {hasFavorited && (
              <Button variant="outline" size="sm" onClick={() => onAction('unfavorite')}>
                <StarOff className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: "modules.notes.bulkActions.unfavorite" })}
              </Button>
            )}
            
            {/* Archive/Unarchive Actions */}
            {hasUnarchived && (
              <Button variant="outline" size="sm" onClick={() => onAction('archive')}>
                <Archive className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: "modules.notes.bulkActions.archive" })}
              </Button>
            )}
            {hasArchived && (
              <Button variant="outline" size="sm" onClick={() => onAction('unarchive')}>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: "modules.notes.bulkActions.unarchive" })}
              </Button>
            )}
            
            {/* Delete Action */}
            {canDelete && (
              <Button variant="destructive" size="sm" onClick={() => onAction('delete')}>
                <Trash2 className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: "modules.notes.bulkActions.moveToTrash" })}
              </Button>
            )}
          </>
        )}
        
        {/* Clear Selection */}
        <Button variant="ghost" size="icon" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}