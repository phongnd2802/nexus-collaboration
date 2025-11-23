import React from "react";
import ConversationSearch from "./ConversationSearch";
import ConversationItem from "./ConversationItem";
import { useConversationList } from "@/hooks/useConversationList";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Conversation {
  lastMessageAt: string;
  lastMessageContent: string;
  unreadCount: number;
  userId?: string;
  user?: User;
  projectId?: string;
  isTeamChat?: boolean;
  name?: string;
  description?: string;
  memberCount?: number;
  lastMessageSender?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

interface ConversationListProps {
  conversations: Conversation[];
  teamConversations: Conversation[];
  selectedId: string | null;
  onSelectConversation: (conversation: Conversation) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onConversationsUpdate?: (updatedConversations: Conversation[]) => void;
  onTeamConversationsUpdate?: (updatedConversations: Conversation[]) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  teamConversations,
  selectedId,
  onSelectConversation,
  searchQuery,
  setSearchQuery,
  onConversationsUpdate,
  onTeamConversationsUpdate,
}) => {
  // Use custom hook to handle Socket.IO events
  useConversationList({
    conversations,
    teamConversations,
    onConversationsUpdate,
    onTeamConversationsUpdate,
  });

  // Combine and sort conversations
  const allConversations = [...conversations, ...teamConversations].sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  // Filter conversations based on search query
  const filteredConversations = allConversations.filter((conversation) => {
    if (conversation.isTeamChat) {
      const projectName = conversation.name?.toLowerCase() || "";
      const projectDesc = conversation.description?.toLowerCase() || "";
      const messageContent =
        conversation.lastMessageContent?.toLowerCase() || "";
      return (
        projectName.includes(searchQuery.toLowerCase()) ||
        projectDesc.includes(searchQuery.toLowerCase()) ||
        messageContent.includes(searchQuery.toLowerCase())
      );
    } else {
      const userName = conversation.user?.name?.toLowerCase() || "";
      const userEmail = conversation.user?.email.toLowerCase() || "";
      const messageContent =
        conversation.lastMessageContent?.toLowerCase() || "";
      return (
        userName.includes(searchQuery.toLowerCase()) ||
        userEmail.includes(searchQuery.toLowerCase()) ||
        messageContent.includes(searchQuery.toLowerCase())
      );
    }
  });

  return (
    <div className="flex flex-col h-full">
      <ConversationSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "No conversations match your search"
                : "No conversations yet"}
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const isTeamChat = !!conversation.isTeamChat;
            const conversationId = isTeamChat
              ? conversation.projectId
              : conversation.userId;
            const isSelected = conversationId === selectedId;

            return (
              <ConversationItem
                key={
                  isTeamChat ? `team-${conversationId}` : `dm-${conversationId}`
                }
                conversation={conversation}
                isSelected={isSelected}
                onClick={() => onSelectConversation(conversation)}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationList;
