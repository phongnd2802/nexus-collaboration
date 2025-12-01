import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FEATURE_MENU_ITEMS } from "./header-config";

interface DesktopNavProps {
  isAuthenticated: boolean;
  onScrollToSection: (id: string) => void;
}

export const DesktopNav = ({ isAuthenticated, onScrollToSection }: DesktopNavProps) => (
  <nav className="hidden sm:ml-8 sm:flex sm:space-x-1">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="neutral" className="flex items-center gap-1 text-foreground/70 hover:text-violet-900 dark:hover:text-violet-400">
          Features <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {FEATURE_MENU_ITEMS.map((item, idx) => (
          <DropdownMenuItem key={idx} className="flex items-center gap-2 cursor-pointer" onClick={() => onScrollToSection(item.sectionId)}>
            <div className="h-8 w-8 rounded-md bg-violet-100 flex items-center justify-center">
              <item.icon className="h-4 w-4 text-violet-700" />
            </div>
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>

    {isAuthenticated && (
      <Button variant="neutral" asChild className="text-foreground/70 hover:text-violet-900 dark:hover:text-violet-400">
        <Link href="/dashboard">Dashboard</Link>
      </Button>
    )}
  </nav>
);