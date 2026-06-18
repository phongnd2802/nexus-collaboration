import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string | React.ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  isLoading?: boolean
  variant?: 'default' | 'destructive'
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  isLoading = false,
  variant = 'default'
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          'border border-[rgba(31,30,29,0.15)] bg-[#FAF9F5] p-0 shadow-[rgba(0,0,0,0.08)_0px_24px_80px_0px]',
          'sm:max-w-[520px] sm:rounded-[16px]',
        )}
      >
        <div className="border-b border-[rgba(31,30,29,0.08)] px-6 py-5">
          <AlertDialogHeader className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                  variant === 'destructive'
                    ? 'bg-[rgba(220,96,56,0.12)] text-[#DC6038]'
                    : 'bg-[rgba(217,119,87,0.12)] text-[#D97757]',
                )}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <AlertDialogTitle className="text-[18px] font-normal leading-7 text-[#1F1E1D]">
                  {title}
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-2 text-[15px] leading-6 text-[#73726C]" asChild={typeof description !== 'string'}>
                  {typeof description === 'string' ? description : <div>{description}</div>}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
        </div>
        <AlertDialogFooter className="border-0 bg-white/70 px-6 py-4 sm:justify-end sm:space-x-3">
          <AlertDialogCancel
            disabled={isLoading}
            className="mt-0 border-[rgba(31,30,29,0.15)] bg-white text-[#1F1E1D] hover:bg-[#FAF9F5]"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'border-0 shadow-[rgba(0,0,0,0.04)_0px_4px_20px_0px]',
              variant === 'destructive'
                ? 'bg-[#DC6038] text-white hover:bg-[#C9542F] focus:ring-[#DC6038]'
                : 'bg-[#1F1E1D] text-white hover:bg-[#0A0A0A] focus:ring-[#1F1E1D]',
            )}
          >
            {isLoading ? 'Processing...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
