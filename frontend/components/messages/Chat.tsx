import React from "react";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import EmptyState from "./EmptyState";
import FallbackAlert from "./FallbackAlert";
import MessageList from "./MessageList";
import { useDirectChat } from "@/hooks/useDirectChat";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface ChatProps {
  selectedUser: User | null;
  currentUserId: string;
  onBackClick?: () => void;
}

const Chat: React.FC<ChatProps> = ({
  selectedUser,
  currentUserId,
  onBackClick,
}) => {
  const {
    messages,
    isLoading,
    isSending,
    isTyping,
    useFallback,
    handleSendMessage,
    handleTyping,
    messagesEndRef,
    inputRef,
  } = useDirectChat({ selectedUser, currentUserId });

  if (!selectedUser) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader user={selectedUser} onBackClick={onBackClick} />

      {useFallback && <FallbackAlert />}

      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        isLoading={isLoading}
        isTyping={isTyping}
        typingUserName={selectedUser.name || "User"}
        emptyStateTitle="No messages yet"
        emptyStateDescription={`Start a conversation with ${
          selectedUser.name || "this user"
        }`}
        useFallback={useFallback}
      />

      <div className="p- border-t">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isSending}
          onTyping={handleTyping}
          inputRef={inputRef}
          fallbackMode={useFallback}
        />
      </div>
    </div>
  );
};

export default Chat;
