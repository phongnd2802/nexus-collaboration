import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";

interface InviteRoleSelectorProps {
  role: string;
  onRoleChange: (role: string) => void;
}

export function InviteRoleSelector({
  role,
  onRoleChange,
}: InviteRoleSelectorProps) {
  const [showRoleOptions, setShowRoleOptions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Admin";
      case "EDITOR":
        return "Editor";
      case "MEMBER":
        return "Member";
      default:
        return "Select a role";
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowRoleOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label htmlFor="role">Role</Label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowRoleOptions(!showRoleOptions)}
          className="w-full flex items-center justify-between px-3 py-2 border border-input rounded-md bg-background text-sm"
          id="role"
        >
          <span>{getRoleDisplay(role)}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>

        {showRoleOptions && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-input bg-popover shadow-md">
            <div className="py-1">
              {["ADMIN", "EDITOR", "MEMBER"].map((option) => (
                <button
                  key={option}
                  type="button"
                  className="relative w-full flex items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    onRoleChange(option);
                    setShowRoleOptions(false);
                  }}
                >
                  <span className="mr-2 flex h-3.5 w-3.5 items-center justify-center">
                    {role === option && <Check className="h-4 w-4" />}
                  </span>
                  {option.charAt(0) + option.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <span className="font-medium">Admin:</span> Full control over the
          project
        </p>
        <p>
          <span className="font-medium">Editor:</span> Create and manage tasks
        </p>
        <p>
          <span className="font-medium">Member:</span> View project and
          participate in tasks assigned to them.
        </p>
      </div>
    </div>
  );
}
