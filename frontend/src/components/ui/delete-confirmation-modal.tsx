import { useIntl } from 'react-intl'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'

interface DeleteConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: string
  itemName?: string
  isLoading?: boolean
}

export function DeleteConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
  isLoading = false,
}: DeleteConfirmationModalProps) {
  const intl = useIntl()

  const defaultTitle = title || intl.formatMessage({ id: 'modals.deleteConfirmation.title' })
  const defaultDescription = description || (itemName
    ? intl.formatMessage({ id: 'modals.deleteConfirmation.descriptionWithName' }, { itemName })
    : intl.formatMessage({ id: 'modals.deleteConfirmation.description' }))

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={defaultTitle}
      description={defaultDescription}
      confirmText={intl.formatMessage({ id: 'common.delete' })}
      cancelText={intl.formatMessage({ id: 'common.cancel' })}
      onConfirm={onConfirm}
      isLoading={isLoading}
      variant="destructive"
    />
  )
}
