"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "next-auth/react";
import DashboardPreview from "./dashboard-preview";

interface HeroProps {
  heroInView?: boolean;
}

const Hero = React.forwardRef<HTMLDivElement, HeroProps>(
  ({ heroInView = true }, ref) => {
    const { status } = useSession();
    const isAuthenticated = status === "authenticated";
    const [scrolled, setScrolled] = useState(false);

    const handleSignOut = () => signOut({ callbackUrl: "/" });

    useEffect(() => {
      const handleScroll = () => setScrolled(window.scrollY > 10);
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Animation variants for cleaner code
    const fadeInUp = {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.6 }
    };

    return (
      <div
        className="bg-linear-to-br from-violet-50 via-background to-purple-50 dark:from-violet-950/30 dark:via-background dark:to-purple-950/20"
        ref={ref}
      >
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${scrolled ? "pt-10" : "pt-30"} pb-10`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Content Section */}
            <motion.div
              className="text-left"
              initial="initial"
              animate="animate"
              variants={fadeInUp}
            >
              <motion.div
                className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/30 px-4 py-1.5 mb-6"
                variants={fadeInUp}
                transition={{ delay: 0.1 }}
              >
                <span className="text-violet-900 dark:text-violet-300 text-sm font-medium flex items-center">
                  <Zap className="h-4 w-4 mr-1.5" /> Introducing Nexus Collaboration
                </span>
              </motion.div>

              <motion.h1
                className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight"
                variants={fadeInUp}
                transition={{ delay: 0.2 }}
              >
                <span className="block">Collaborate</span>
                <span className="block">Seamlessly on</span>
                <span className="bg-clip-text text-transparent bg-linear-to-br from-violet-700 to-purple-600 dark:from-violet-500 dark:to-purple-400">
                  Projects
                </span>
              </motion.h1>

              <motion.p
                className="mt-8 text-xl text-muted-foreground max-w-lg"
                variants={fadeInUp}
                transition={{ delay: 0.3 }}
              >
                Streamline your team's workflow with our intuitive project management platform. Create projects, manage tasks, and collaborate effectively.
              </motion.p>

              <motion.div
                className="mt-10 flex flex-col sm:flex-row gap-4"
                variants={fadeInUp}
                transition={{ delay: 0.4 }}
              >
                {isAuthenticated ? (
                  <>
                    <Button asChild size="lg" className="bg-violet-700 hover:bg-violet-900 text-white px-8 py-6 rounded-lg shadow-lg hover:scale-105 transition-all">
                      <Link href="/dashboard">
                        Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="lg" onClick={handleSignOut} className="px-8 py-6 rounded-lg">
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild size="lg" className="bg-violet-700 hover:bg-violet-900 text-white px-8 py-6 rounded-lg shadow-lg hover:scale-105 transition-all">
                      <Link href="/auth/signup">
                        Get Started <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="px-8 py-6 rounded-lg">
                      <Link href="/auth/signin">Sign In</Link>
                    </Button>
                  </>
                )}
              </motion.div>
            </motion.div>

            {/* Right Visual Section - Now Refactored */}
            <motion.div
              className="flex items-center justify-center lg:justify-end"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <DashboardPreview inView={heroInView} />
            </motion.div>
            
          </div>
        </div>
      </div>
    );
  }
);

Hero.displayName = "Hero";

export default Hero;