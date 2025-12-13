import React from "react";
import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description }) => {
  const t = useTranslations("MessagesPage.emptyState");
  const displayTitle = title || t("title");
  const displayDescription = description || t("description");

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <MessageSquare className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-medium">{displayTitle}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {displayDescription}
      </p>
    </div>
  );
};

export default EmptyState;
