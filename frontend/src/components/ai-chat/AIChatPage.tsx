import { useParams } from 'react-router-dom'
import { useIntl } from 'react-intl'

import { AIChatSidebar } from './AIChatSidebar'
import { AIChatMessages } from './AIChatMessages'
import { AIChatInput } from './AIChatInput'
import { AIChatEmpty } from './AIChatEmpty'
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog'
import { useAIChatPageState } from './useAIChatPageState'

export function AIChatPage() {
  const { workspaceId, sessionId } = useParams<{ workspaceId: string; sessionId?: string }>()
  const intl = useIntl()

  const {
    conversations,
    activeConversationId,
    timelineItems,
    isStreaming,
    isHydratingSession,
    isLoadingSessions,
    deleteConversationDialog,
    isDeletingConversation,
    hasConversation,
    handleSend,
    handleStop,
    handleRegenerate,
    handleNewConversation,
    handleSelectConversation,
    handleDeleteConversation,
    handleDeleteConversationDialogChange,
    confirmDeleteConversation,
    handleRenameConversation,
  } = useAIChatPageState({ workspaceId, routeSessionId: sessionId, intl })

  const showSidebar = conversations.length > 0 || isLoadingSessions

  return (
    <div className="flex h-full bg-[#FAF9F5]">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
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
          />
        ) : (
          <>
            <AIChatMessages
              items={timelineItems}
              isLoading={isHydratingSession && timelineItems.length === 0}
              onRegenerate={handleRegenerate}
            />
            <AIChatInput
              onSend={handleSend}
              onStop={handleStop}
              isStreaming={isStreaming}
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
              'Delete "{title}"? This will remove the conversation history.',
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
