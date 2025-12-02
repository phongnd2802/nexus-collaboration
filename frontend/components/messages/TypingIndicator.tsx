import React from "react";
import { useTranslations } from "next-intl";

interface TypingIndicatorProps {
  userName: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userName }) => {
  const t = useTranslations("MessagesPage.messageList");
  return (
    <div className="flex items-center text-sm text-muted-foreground my-2">
      <div className="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className="ml-2">{t("isTyping", { name: userName })}</span>
    </div>
  );
};

export default TypingIndicator;
