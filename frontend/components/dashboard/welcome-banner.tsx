"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Clock, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface WelcomeBannerProps {
  userName: string;
  tasksDue: number;
  projectsDue: number;
}

export const WelcomeBanner = ({
  userName,
  tasksDue,
  projectsDue,
}: WelcomeBannerProps) => {
  const t = useTranslations("DashboardPage.welcomeBanner");

  // Greeting
  const hours = new Date().getHours();
  let greeting = t("goodMorning");
  if (hours >= 12 && hours < 18) greeting = t("goodAfternoon");
  else if (hours >= 18) greeting = t("goodEvening");

  // Date
  const today = new Date();
  const weekday = t(
    `weekday.${today.toLocaleDateString("en-US", { weekday: "long" })}`
  );
  const month = t(
    `month.${today.toLocaleDateString("en-US", { month: "long" })}`
  );
  const day = today.getDate();
  const year = today.getFullYear();
  const dateString = `${weekday}, ${day} ${month} ${year}`;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl bg-linear-to-r bg-main text-white shadow-shadow p-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Bóng mờ trang trí */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Nội dung bên trái */}
        <div className="space-y-2">
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-3 flex-wrap"
          >
            <div className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm backdrop-blur-sm">
              <Clock className="mr-2 h-3 w-3" />
              <span>{dateString}</span>
            </div>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-3xl font-bold">
            {greeting}, {userName}!
          </motion.h1>

          <motion.p variants={itemVariants} className="text-white/80">
            <Link href="/calendar?tab=deadlines">
              <span className="font-semibold">
                {t("tasksDueMessage", { count: tasksDue })}
              </span>
            </Link>
          </motion.p>
        </div>

        {/* Nội dung bên phải */}
        <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
          <Link href="/calendar">
            <Button
              size="sm"
              className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm dark:text-accent-foreground cursor-pointer"
            >
              <Calendar className="mr-2 h-4 w-4" />
              {t("viewSchedule")}
            </Button>
          </Link>

          <Link href="/projects/create">
            <Button
              size="sm"
              className="rounded-full bg-white text-main hover:bg-white/90 cursor-pointer"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {t("createProject")}
              <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
};
