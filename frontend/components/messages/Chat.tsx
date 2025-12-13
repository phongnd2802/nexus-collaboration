import React from "react";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import EmptyState from "./EmptyState";
import FallbackAlert from "./FallbackAlert";
import MessageList from "./MessageList";
import { useDirectChat } from "@/hooks/useDirectChat";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("MessagesPage.chat");
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
        emptyStateTitle={t("noMessages")}
        emptyStateDescription={t("startConversationWith", {
          name: selectedUser.name || t("thisUser"),
        })}
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
