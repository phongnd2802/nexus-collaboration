"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useHeaderLogic } from "@/hooks/use-header-logic";
import { HeaderLogo } from "./header-logo";
import { DesktopNav } from "./desktop-nav";
import { UserDropdown } from "./user-drop-down";
import { MobileNav } from "./mobile-nav";

export default function Header() {
  const {
    isAuthenticated,
    scrolled,
    mobileMenuOpen,
    setMobileMenuOpen,
    userData,
    isLoading,
    scrollToSection,
    getInitials,
  } = useHeaderLogic();

  return (
    <header
      className={`top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? "sticky bg-background/95"
          : mobileMenuOpen
          ? "sticky bg-background/10"
          : "absolute bg-background/10"
      } backdrop-blur-md shadow-sm`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left Section: Logo & Desktop Navigation */}
          <div className="flex items-center">
            <HeaderLogo />
            <DesktopNav
              isAuthenticated={isAuthenticated}
              onScrollToSection={scrollToSection}
            />
          </div>

          {/* Right Section: Auth, Theme & Mobile Toggle */}
          <div className="flex items-center">
            {/* Theme Toggle - Visible on all screens */}
            <div className="hidden sm:block mr-4">
              <ThemeToggle />
            </div>

            {/* Desktop Auth Status */}
            <div className="hidden sm:flex sm:items-center">
              {isLoading ? (
                <div className="h-10 w-24 bg-muted animate-pulse rounded-md"></div>
              ) : isAuthenticated ? (
                <UserDropdown userData={userData} getInitials={getInitials} />
              ) : (
                <div className="flex items-center space-x-4">
                  <Button
                    asChild
                    variant="ghost"
                    className="text-foreground/70 hover:text-violet-900 dark:hover:text-violet-400"
                  >
                    <Link href="/auth/signin">Sign In</Link>
                  </Button>
                  <Button
                    asChild
                    className="bg-violet-700 hover:bg-violet-900 text-white"
                  >
                    <Link href="/auth/signup">Sign Up</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Toggle & Theme (Mobile only) */}
            <div className="flex items-center sm:hidden">
              <ThemeToggle />
              <MobileNav
                isOpen={mobileMenuOpen}
                setIsOpen={setMobileMenuOpen}
                isAuthenticated={isAuthenticated}
                isLoading={isLoading}
                userData={userData}
                onScrollToSection={scrollToSection}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer is now handled inside MobileNav or can be rendered here if portal needed */}
    </header>
  );
}
