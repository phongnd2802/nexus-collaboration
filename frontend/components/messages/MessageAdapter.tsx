import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { formatTime } from "@/lib/message-utils";
import { useTranslations } from "next-intl";

interface TeamChatMessage {
  id: string;
  content: string;
  userId: string;
  projectId: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface MessageAdapterProps {
  message: TeamChatMessage;
  currentUserId: string;
  isTeamChat?: boolean;
}

const MessageAdapter: React.FC<MessageAdapterProps> = ({
  message,
  currentUserId,
  isTeamChat = false,
}) => {
  const t = useTranslations("MessagesPage.chatHeader");
  const isCurrentUser = message.userId === currentUserId;

  return (
    <div
      className={cn("flex gap-3 mb-4", isCurrentUser ? "flex-row-reverse" : "")}
    >
      {!isCurrentUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={message.user.image || ""}
            alt={message.user.name || t("userAlt")}
          />
          <AvatarFallback className="bg-linear-to-br from-violet-500 to-indigo-700 text-white text-xs">
            {getInitials(message.user.name)}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "flex flex-col max-w-[75%]",
          isCurrentUser ? "items-end" : ""
        )}
      >
        {/* we Show sender name for team chats when not the current user */}
        {isTeamChat && !isCurrentUser && (
          <span className="text-xs font-medium text-primary mb-1">
            {message.user.name || t("userAlt")}
          </span>
        )}
        <div
          className={cn(
            "px-4 py-2 rounded-lg",
            isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
          )}
        >
          <p className="text-sm">{message.content}</p>
        </div>
        <span className="text-xs text-muted-foreground mt-1">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
};

export default MessageAdapter;
