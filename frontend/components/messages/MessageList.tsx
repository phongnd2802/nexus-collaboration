import React, { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import MessageAdapter from "./MessageAdapter";
import { Loader2 } from "lucide-react";
import EmptyState from "./EmptyState";

interface MessageListProps {
  messages: any[]; // Using any[] for now to support both Message and TeamChatMessage
  currentUserId: string;
  isTeamChat?: boolean;
  isLoading?: boolean;
  isTyping?: boolean;
  typingUserName?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  useFallback?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isTeamChat = false,
  isLoading = false,
  isTyping = false,
  typingUserName = "User",
  emptyStateTitle = "No messages yet",
  emptyStateDescription = "Start a conversation",
  useFallback = false,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          title={emptyStateTitle}
          description={emptyStateDescription}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((message) =>
        isTeamChat ? (
          <MessageAdapter
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            isTeamChat={true}
          />
        ) : (
          <ChatMessage
            key={message.id}
            message={message}
            currentUserId={currentUserId}
          />
        )
      )}
      {isTyping && !useFallback && (
        <div className="flex items-center text-sm text-muted-foreground my-2">
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="ml-2">{typingUserName} is typing...</span>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
