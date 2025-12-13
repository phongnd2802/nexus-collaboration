import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUserSearch } from "@/hooks/useUserSearch";
import UserSearchResults from "./UserSearchResults";
import { useTranslations } from "next-intl";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface NewMessageButtonProps {
  onSelectUser: (user: User) => void;
}

const NewMessageButton: React.FC<NewMessageButtonProps> = ({
  onSelectUser,
}) => {
  const t = useTranslations("MessagesPage.button");
  const [open, setOpen] = useState(false);
  const { searchQuery, searchResults, isLoading, handleSearch, clearSearch } =
    useUserSearch();

  const handleSelectUser = (user: User) => {
    onSelectUser(user);
    setOpen(false);
    clearSearch();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full">
          <PlusCircle className="h-4 w-4 mr-2" />
          {t("newMessage")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newMessage")}</DialogTitle>
        </DialogHeader>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="noShadow"
              size="sm"
              className="absolute right-1 top-1 h-8 w-8 p-0"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          <UserSearchResults
            searchQuery={searchQuery}
            searchResults={searchResults}
            isLoading={isLoading}
            onSelectUser={handleSelectUser}
            onClearSearch={clearSearch}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <DialogClose asChild>
            <Button variant="neutral">{t("cancel")}</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewMessageButton;
