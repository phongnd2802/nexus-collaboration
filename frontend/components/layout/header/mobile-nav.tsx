import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Menu } from "lucide-react";
import UserAuthStatus from "@/components/auth/user-auth-status";

interface MobileNavProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  userData: any;
  onScrollToSection: (id: string) => void;
}

export const MobileNav = ({ isOpen, setIsOpen, isAuthenticated, isLoading, userData, onScrollToSection }: MobileNavProps) => (
  <>
    {/* Toggle Button */}
    <div className="flex items-center sm:hidden ml-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-violet-500"
      >
        <span className="sr-only">Open main menu</span>
        {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
      </button>
    </div>

    {/* Drawer Content */}
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="sm:hidden bg-background border-b border-border"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="pt-2 pb-3 space-y-1 px-4">
            <button
              className="block w-full text-left py-2 px-3 text-base font-medium text-foreground/70 hover:bg-violet-50 hover:text-violet-900 rounded-md"
              onClick={() => onScrollToSection("features")}
            >
              Features
            </button>
            {isAuthenticated && (
              <Link
                href="/dashboard"
                className="block py-2 px-3 text-base font-medium text-foreground/70 hover:bg-violet-50 hover:text-violet-900 rounded-md"
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </Link>
            )}
          </div>
          
          <div className="pt-4 pb-3 border-t border-muted">
            {isLoading ? (
              <div className="px-4"><div className="h-10 w-full bg-muted animate-pulse rounded-md"></div></div>
            ) : isAuthenticated ? (
              <UserAuthStatus
                mobile={true}
                onAction={() => setIsOpen(false)}
                Authenticated={true}
                Name={userData?.name}
                Email={userData?.email}
                Image={userData?.image}
              />
            ) : (
              <div className="mt-3 space-y-1 px-2">
                <Link
                  href="/auth/signin"
                  className="block px-3 py-2 rounded-md text-base font-medium text-foreground/70 hover:bg-violet-50 hover:text-violet-900"
                  onClick={() => setIsOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="block px-3 py-2 rounded-md text-base font-medium text-foreground/70 hover:bg-violet-50 hover:text-violet-900"
                  onClick={() => setIsOpen(false)}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
);