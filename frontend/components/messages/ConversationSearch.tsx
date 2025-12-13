import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

interface ConversationSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const ConversationSearch: React.FC<ConversationSearchProps> = ({
  searchQuery,
  onSearchChange,
}) => {
  const t = useTranslations("MessagesPage.conversationSearch");
  return (
    <div className="p-3 border-b">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t("placeholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
};

export default ConversationSearch;
