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
        <Button
          variant="default"
          className="w-full bg-violet-700 hover:bg-violet-800 text-white flex items-center cursor-pointer"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for a user..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="neutral"
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
            <Button variant="neutral">Cancel</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewMessageButton;
