import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";

interface UserProfile {
  name?: string;
  email?: string;
  image?: string;
}

export const useHeaderLogic = () => {
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isAuthenticated = status === "authenticated";
  const isHomePage = pathname === "/";

  // Handle Scroll Effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch User Profile
  useEffect(() => {
    if (isAuthenticated && session?.user) {
      const fetchUserProfile = async () => {
        setIsLoadingProfile(true);
        try {
          const response = await fetch("/api/user/profile");
          if (response.ok) {
            const data = await response.json();
            setUserData(data);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        } finally {
          setIsLoadingProfile(false);
        }
      };
      fetchUserProfile();
    }
  }, [isAuthenticated, session]);

  // Smooth Scroll Logic
  const scrollToSection = useCallback((sectionId: string) => {
    setMobileMenuOpen(false);

    if (!isHomePage) {
      router.push(`/?section=${sectionId}`);
      return;
    }

    // Small timeout for mobile/rendering stability
    setTimeout(() => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
    }, isMobile ? 300 : 0);
  }, [isHomePage, isMobile, router]);

  // Helper: Get Initials
  const getInitials = useCallback((name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }, []);

  return {
    session,
    status,
    isAuthenticated,
    scrolled,
    mobileMenuOpen,
    setMobileMenuOpen,
    userData,
    isLoading: status === "loading" || isLoadingProfile,
    scrollToSection,
    getInitials,
  };
};