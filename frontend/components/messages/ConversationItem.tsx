import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { formatLastActive, truncateMessage } from "@/lib/message-utils";
import { Users } from "lucide-react";

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

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  onClick,
}) => {
  const isTeamChat = !!conversation.isTeamChat;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors",
        isSelected && "bg-accent",
        conversation.unreadCount > 0 && "bg-accent/20"
      )}
      onClick={onClick}
    >
      <div className="relative">
        {isTeamChat ? (
          <Avatar className="bg-main dark:bg-main">
            <AvatarFallback className="bg-linear-to-br from-main to-indigo-700 text-white">
              {getInitials(conversation.name ?? null)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <Avatar>
            <AvatarImage
              src={conversation.user?.image || ""}
              alt={conversation.user?.name || "User"}
            />
            <AvatarFallback>
              {getInitials(conversation.user?.name ?? null)}
            </AvatarFallback>
          </Avatar>
        )}
        {conversation.unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-background"></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <h3
            className={cn(
              "font-medium truncate flex items-center",
              conversation.unreadCount > 0 && "font-semibold"
            )}
          >
            {isTeamChat ? (
              <>
                {conversation.name || "Project Chat"}
                <Users className="h-3 w-3 ml-1 text-muted-foreground" />
              </>
            ) : (
              conversation.user?.name || conversation.user?.email
            )}
          </h3>
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
            {formatLastActive(conversation.lastMessageAt)}
          </span>
        </div>
        <p
          className={cn(
            "text-sm truncate",
            conversation.unreadCount > 0
              ? "text-foreground font-medium"
              : "text-muted-foreground"
          )}
        >
          {isTeamChat && conversation.lastMessageSender ? (
            <span>
              <span className="font-medium">
                {conversation.lastMessageSender.name || "User"}:
              </span>{" "}
              {truncateMessage(conversation.lastMessageContent)}
            </span>
          ) : (
            truncateMessage(conversation.lastMessageContent)
          )}
        </p>
      </div>
      {conversation.unreadCount > 0 && (
        <div className="bg-primary text-primary-foreground text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1.5">
          {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
        </div>
      )}
    </div>
  );
};

export default ConversationItem;
