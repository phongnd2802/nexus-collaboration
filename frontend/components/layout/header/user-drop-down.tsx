import Link from "next/link";
import { LogOut, User, Settings, Zap } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UserAuthStatus from "@/components/auth/user-auth-status";

interface UserDropdownProps {
  userData: any;
  getInitials: (name: string) => string;
}

export const UserDropdown = ({ userData, getInitials }: UserDropdownProps) => {
  const userName = userData?.name || "";
  const userEmail = userData?.email || "";
  const userImage = userData?.image || "";

  return (
    <div className="flex items-center space-x-4 ml-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" className="rounded-full h-10 w-10 p-0 overflow-hidden">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userImage} alt={userName} className="object-cover" />
              <AvatarFallback className="bg-linear-to-br from-main to-main text-white text-sm">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="pb-2">
            <UserAuthStatus Authenticated={true} Name={userName} Email={userEmail} Image={userImage} />
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile?tab=profile" className="cursor-pointer">
              <User className="h-4 w-4 mr-2" /> Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile?tab=settings" className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" /> Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="cursor-pointer">
              <Zap className="h-4 w-4 mr-2" /> Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })} className="text-red-600 cursor-pointer">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};