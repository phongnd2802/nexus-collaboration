import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface UserSearchResultsProps {
  searchQuery: string;
  searchResults: User[];
  isLoading: boolean;
  onSelectUser: (user: User) => void;
  onClearSearch: () => void;
}

const UserSearchResults: React.FC<UserSearchResultsProps> = ({
  searchQuery,
  searchResults,
  isLoading,
  onSelectUser,
  onClearSearch,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (searchResults.length === 0) {
    return (
      <div className="py-8 text-center">
        {searchQuery.length > 1 ? (
          <p className="text-sm text-muted-foreground">No users found</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Start typing to search for users
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {searchResults.map((user) => (
        <div
          key={user.id}
          className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
          onClick={() => onSelectUser(user)}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.image || ""} alt={user.name || "User"} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {user.name || "Unnamed User"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserSearchResults;
