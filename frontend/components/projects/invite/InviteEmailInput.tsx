import { useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { User } from "@/types/index";

interface InviteEmailInputProps {
  email: string;
  onEmailChange: (value: string) => void;
  suggestions: User[];
  isLoading: boolean;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  onSuggestionSelect: (user: User) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  selectedSuggestionIndex: number;
  onClear: () => void;
}

export function InviteEmailInput({
  email,
  onEmailChange,
  suggestions,
  isLoading,
  showSuggestions,
  setShowSuggestions,
  onSuggestionSelect,
  onKeyDown,
  selectedSuggestionIndex,
  onClear,
}: InviteEmailInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowSuggestions]);

  return (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
        <Input
          ref={inputRef}
          id="email"
          type="email"
          placeholder="Enter email address"
          className="pl-9 pr-9"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (email.length >= 2 && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          autoComplete="off"
          required
        />
        {email && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-8 w-8 p-0 z-10"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {showSuggestions && (
          <div
            ref={suggestionsRef}
            className="absolute z-20 mt-1 w-full rounded-md border border-input bg-popover shadow-md max-h-[200px] overflow-y-auto"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            ) : suggestions.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">No users found</p>
              </div>
            ) : (
              <div className="py-1">
                {suggestions.map((user, index) => (
                  <button
                    key={user.id}
                    type="button"
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent cursor-pointer ${
                      selectedSuggestionIndex === index ? "bg-accent" : ""
                    }`}
                    onClick={() => onSuggestionSelect(user)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.image || ""}
                        alt={user.name || "User"}
                      />
                      <AvatarFallback className="text-xs">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.name || "Unnamed User"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Enter the email address of the user you want to invite
      </p>
    </div>
  );
}
