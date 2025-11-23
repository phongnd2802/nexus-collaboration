import React from "react";
import TeamChatHeader from "./TeamChatHeader";
import ChatInput from "./ChatInput";
import EmptyState from "./EmptyState";
import MessageList from "./MessageList";
import { useTeamChat } from "@/hooks/useTeamChat";

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
        emptyStateTitle="No messages yet"
        emptyStateDescription={`Start a conversation in ${selectedProject.name} team chat`}
      />

      <div className="p-4 border-t">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isSending}
          inputRef={inputRef}
          placeholder={`Message to ${selectedProject.name} team...`}
        />
      </div>
    </div>
  );
};

export default TeamChat;
