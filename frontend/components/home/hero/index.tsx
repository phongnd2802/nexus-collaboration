"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "next-auth/react";
import DashboardPreview from "./dashboard-preview";
import { useTranslations } from "next-intl";

interface HeroProps {
  heroInView?: boolean;
}

const Hero = React.forwardRef<HTMLDivElement, HeroProps>(
  ({ heroInView = true }, ref) => {
    const t = useTranslations("HomePage.hero");
    const { status } = useSession();
    const isAuthenticated = status === "authenticated";
    const [scrolled, setScrolled] = useState(false);

    const handleSignOut = () => signOut({ callbackUrl: "/" });

    useEffect(() => {
      const handleScroll = () => setScrolled(window.scrollY > 10);
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const fadeInUp = {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.6 },
    };

    return (
      <div
        ref={ref}
        className="
          bg-linear-to-br 
          from-main/10 via-background to-main/20 
          dark:from-main/20 dark:via-background dark:to-main/10
        "
      >
        <div
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${
            scrolled ? "pt-10" : "pt-30"
          } pb-10`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <motion.div
              className="text-left"
              initial="initial"
              animate="animate"
              variants={fadeInUp}
            >
              {/* Badge */}
              <motion.div
                className="
                  inline-flex items-center rounded-full 
                  bg-main/15 dark:bg-main/20 
                  px-4 py-1.5 mb-6
                "
                variants={fadeInUp}
                transition={{ delay: 0.1 }}
              >
                <span className="text-main text-sm font-medium flex items-center">
                  <Zap className="h-4 w-4 mr-1.5" /> {t("badge")}
                </span>
              </motion.div>

              {/* Title */}
              <motion.h1
                className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight"
                variants={fadeInUp}
                transition={{ delay: 0.2 }}
              >
                <span className="block">{t("title1")}</span>
                <span className="block">{t("title2")}</span>

                {/* Highlight */}
                <span
                  className="
                    bg-clip-text text-transparent 
                    bg-linear-to-br from-main to-main/70
                  "
                >
                  {t("titleHighlight")}
                </span>
              </motion.h1>

              <motion.p
                className="mt-8 text-xl text-muted-foreground max-w-lg"
                variants={fadeInUp}
                transition={{ delay: 0.3 }}
              >
                {t("description")}
              </motion.p>

              {/* Buttons */}
              <motion.div
                className="mt-10 flex flex-col sm:flex-row gap-4"
                variants={fadeInUp}
                transition={{ delay: 0.4 }}
              >
                {isAuthenticated ? (
                  <>
                    <Button
                      asChild
                      size="lg"
                      className="
                        bg-main hover:bg-main/80 text-white 
                        px-8 py-6 rounded-lg shadow-lg 
                        hover:scale-105 transition-all
                      "
                    >
                      <Link href="/dashboard">
                        {t("dashboard")} <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>

                    <Button
                      variant="neutral"
                      size="lg"
                      onClick={handleSignOut}
                      className="px-8 py-6 rounded-lg"
                    >
                      {t("signOut")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      asChild
                      size="lg"
                      className="
                        bg-main hover:bg-main/80 text-white 
                        px-8 py-6 rounded-lg shadow-lg 
                        hover:scale-105 transition-all
                      "
                    >
                      <Link href="/auth/signup">
                        {t("getStarted")} <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="neutral"
                      size="lg"
                      className="px-8 py-6 rounded-lg"
                    >
                      <Link href="/auth/signin">{t("signIn")}</Link>
                    </Button>
                  </>
                )}
              </motion.div>
            </motion.div>

            {/* Right */}
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
