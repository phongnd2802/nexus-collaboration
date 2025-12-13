import { useEffect } from "react";
import { useSocket } from "@/components/context/socket-context";

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

interface UseConversationListProps {
  conversations: Conversation[];
  teamConversations: Conversation[];
  onConversationsUpdate?: (updatedConversations: Conversation[]) => void;
  onTeamConversationsUpdate?: (updatedConversations: Conversation[]) => void;
}

export function useConversationList({
  conversations,
  teamConversations,
  onConversationsUpdate,
  onTeamConversationsUpdate,
}: UseConversationListProps) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Direct message conversation updates
    const handleConversationUpdate = (data: {
      userId: string;
      lastMessageAt: string;
      lastMessageContent?: string;
      isUnread: boolean;
    }) => {
      const updatedConversations = [...conversations];

      const conversationIndex = updatedConversations.findIndex(
        (conv) => conv.userId === data.userId
      );

      if (conversationIndex >= 0) {
        const updatedConversation = {
          ...updatedConversations[conversationIndex],
          lastMessageAt: data.lastMessageAt,
          unreadCount: data.isUnread
            ? updatedConversations[conversationIndex].unreadCount + 1
            : updatedConversations[conversationIndex].unreadCount,
        };

        if (data.lastMessageContent) {
          updatedConversation.lastMessageContent = data.lastMessageContent;
        }

        updatedConversations.splice(conversationIndex, 1);
        updatedConversations.unshift(updatedConversation);
      }

      if (onConversationsUpdate) {
        onConversationsUpdate(updatedConversations);
      }
    };

    // Team conversation updates
    const handleTeamConversationUpdate = (data: {
      projectId: string;
      lastMessageAt: string;
      lastMessageContent?: string;
      lastMessageSender?: {
        id: string;
        name: string | null;
        image: string | null;
      } | null;
      isUnread: boolean;
    }) => {
      const updatedTeamConversations = [...teamConversations];

      const conversationIndex = updatedTeamConversations.findIndex(
        (conv) => conv.projectId === data.projectId
      );

      if (conversationIndex >= 0) {
        const updatedConversation = {
          ...updatedTeamConversations[conversationIndex],
          lastMessageAt: data.lastMessageAt,
          unreadCount: data.isUnread
            ? updatedTeamConversations[conversationIndex].unreadCount + 1
            : updatedTeamConversations[conversationIndex].unreadCount,
        };

        if (data.lastMessageContent) {
          updatedConversation.lastMessageContent = data.lastMessageContent;
        }

        if (data.lastMessageSender) {
          updatedConversation.lastMessageSender = data.lastMessageSender;
        }

        updatedTeamConversations.splice(conversationIndex, 1);
        updatedTeamConversations.unshift(updatedConversation);
      }

      if (onTeamConversationsUpdate) {
        onTeamConversationsUpdate(updatedTeamConversations);
      }
    };

    // Messages read status
    const handleMessagesRead = (data: { userId: string }) => {
      const updatedConversations = conversations.map((conv) => {
        if (conv.userId === data.userId) {
          return { ...conv, unreadCount: 0 };
        }
        return conv;
      });

      if (onConversationsUpdate) {
        onConversationsUpdate(updatedConversations);
      }
    };

    socket.on("conversation_update", handleConversationUpdate);
    socket.on("team_conversation_update", handleTeamConversationUpdate);
    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.off("conversation_update", handleConversationUpdate);
      socket.off("team_conversation_update", handleTeamConversationUpdate);
      socket.off("messages_read", handleMessagesRead);
    };
  }, [
    socket,
    conversations,
    teamConversations,
    onConversationsUpdate,
    onTeamConversationsUpdate,
  ]);
}
