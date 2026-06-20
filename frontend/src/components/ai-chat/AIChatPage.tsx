import React, { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Sparkles } from 'lucide-react'

import { useWorkspaceMembers } from '@/lib/api/workspace-api'
import { useAuth } from '@/contexts/AuthContext'

import { AIChatSidebar } from './AIChatSidebar'
import { AIChatMessages } from './AIChatMessages'
import { AIChatInput } from './AIChatInput'
import { AIChatEmpty } from './AIChatEmpty'
import { AIChatApprovalContent } from './AIChatApprovalContent'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import type { AIChatTimelineItem } from './types'
import { useAIChatPageState } from './useAIChatPageState'

export function AIChatPage() {
  const { workspaceId, sessionId } = useParams<{ workspaceId: string; sessionId?: string }>()
  const intl = useIntl()
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId || '')
  const { user } = useAuth()

  const {
    conversations,
    activeConversationId,
    activeApprovalItemId,
    timelineItems,
    isStreaming,
    isThinking,
    isHydratingSession,
    isLoadingSessions,
    deleteConversationDialog,
    isDeletingConversation,
    model,
    setModel,
    hasConversation,
    handleSend,
    handleStop,
    handleApprovalDecision,
    handleRegenerate,
    handleNewConversation,
    handleSelectConversation,
    handleDeleteConversation,
    handleDeleteConversationDialogChange,
    confirmDeleteConversation,
    handleRenameConversation,
  } = useAIChatPageState({ workspaceId, routeSessionId: sessionId, intl })

  const renderApprovalContent = useCallback(
    (item: AIChatTimelineItem) => {
      if (item.type !== 'approval_required') return null

      return (
        <AIChatApprovalContent
          item={item}
          isActive={item.id === activeApprovalItemId}
          isSubmitting={isStreaming}
          members={workspaceMembers}
          currentUserId={user?.id}
          onApprove={formData => handleApprovalDecision('approve', formData)}
          onDeny={() => handleApprovalDecision('deny')}
        />
      )
    },
    [activeApprovalItemId, isStreaming, workspaceMembers, user?.id, handleApprovalDecision],
  )

  const showSidebar = conversations.length > 0 || isLoadingSessions

  return (
    <div className="flex h-full bg-[#FAF9F5]">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes thinkingPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <aside
        className={`bg-card/80 backdrop-blur-xl border-r border-border flex flex-col overflow-hidden transition-all duration-300 z-40 ${
          showSidebar ? 'w-60' : 'w-0 pointer-events-none'
        }`}
        aria-hidden={!showSidebar}
      >
        <div
          className={`h-full w-60 flex-shrink-0 transition-transform duration-300 ease-in-out ${
            showSidebar ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <AIChatSidebar
            conversations={conversations.map(item => ({
              id: item.id,
              title: item.title,
              messageCount: item.items.length,
              updatedAt: item.updatedAt,
            }))}
            activeId={activeConversationId}
            onSelect={handleSelectConversation}
            onNew={handleNewConversation}
            onDelete={handleDeleteConversation}
            onRename={handleRenameConversation}
            isLoading={isLoadingSessions}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!hasConversation && !isHydratingSession ? (
          <AIChatEmpty
            onSend={handleSend}
            isStreaming={isStreaming}
            onStop={handleStop}
            model={model}
            onModelChange={setModel}
          />
        ) : (
          <>
            <AIChatMessages
              items={timelineItems}
              isLoading={isHydratingSession && timelineItems.length === 0}
              onRegenerate={handleRegenerate}
              renderApprovalContent={renderApprovalContent}
            />
            {isThinking && (
              <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-6 py-4">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#D97757]">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[15px] text-[#73726C]">
                    {intl.formatMessage({ id: 'modules.aiChat.status.thinking', defaultMessage: 'Thinking' })}
                  </span>
                  <span className="flex gap-0.5">
                    <span className="h-1 w-1 animate-[thinkingPulse_1.4s_ease-in-out_infinite] rounded-full bg-[#D97757]" />
                    <span className="h-1 w-1 animate-[thinkingPulse_1.4s_ease-in-out_0.2s_infinite] rounded-full bg-[#D97757]" />
                    <span className="h-1 w-1 animate-[thinkingPulse_1.4s_ease-in-out_0.4s_infinite] rounded-full bg-[#D97757]" />
                  </span>
                </div>
              </div>
            )}
            <AIChatInput
              onSend={handleSend}
              onStop={handleStop}
              isStreaming={isStreaming}
              model={model}
              onModelChange={setModel}
            />
          </>
        )}
      </div>
      <ConfirmationDialog
        open={Boolean(deleteConversationDialog)}
        onOpenChange={handleDeleteConversationDialogChange}
        title={intl.formatMessage({
          id: 'modules.aiChat.deleteSession.title',
          defaultMessage: 'Delete AI chat session?',
        })}
        description={intl.formatMessage(
          {
            id: 'modules.aiChat.deleteSession.description',
            defaultMessage:
              'Delete "{title}"? This will remove the conversation history and cancel any pending approvals in this session.',
          },
          { title: deleteConversationDialog?.title || intl.formatMessage({ id: 'modules.aiChat.sidebar.untitled', defaultMessage: 'Untitled chat' }) },
        )}
        confirmText={intl.formatMessage({
          id: 'modules.aiChat.deleteSession.confirm',
          defaultMessage: 'Delete session',
        })}
        cancelText={intl.formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}
        onConfirm={confirmDeleteConversation}
        isLoading={isDeletingConversation}
        variant="destructive"
      />
    </div>
  )
}
