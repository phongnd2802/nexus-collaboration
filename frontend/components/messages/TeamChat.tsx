import React from "react";
import TeamChatHeader from "./TeamChatHeader";
import ChatInput from "./ChatInput";
import EmptyState from "./EmptyState";
import MessageList from "./MessageList";
import { useTeamChat } from "@/hooks/useTeamChat";
import { useTranslations } from "next-intl";

interface TeamProject {
  id: string;
  name: string;
  description?: string;
  creator?: string;
  memberCount: number;
}

interface TeamChatProps {
  selectedProject: TeamProject | null;
  currentUserId: string;
  onBackClick?: () => void;
}

const TeamChat: React.FC<TeamChatProps> = ({
  selectedProject,
  currentUserId,
  onBackClick,
}) => {
  const t = useTranslations("MessagesPage.chat");
  const { messages, isLoading, isSending, handleSendMessage, inputRef } =
    useTeamChat({ selectedProject, currentUserId });

  if (!selectedProject) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col h-full">
      <TeamChatHeader project={selectedProject} onBackClick={onBackClick} />

      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        isTeamChat={true}
        isLoading={isLoading}
        emptyStateTitle={t("noMessages")}
        emptyStateDescription={t("startConversationIn", {
          name: selectedProject.name,
        })}
      />

      <div className="p-4 border-t">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isSending}
          inputRef={inputRef}
          placeholder={t("messageTo", { name: selectedProject.name })}
        />
      </div>
    </div>
  );
};

export default TeamChat;
