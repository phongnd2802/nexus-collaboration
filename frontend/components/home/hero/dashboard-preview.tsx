import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, MousePointer, Calendar as CalendarIcon, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHeroAnimation } from "@/hooks/use-hero-animation";
import { CalendarView } from "./calendar"; 
import { TeamView } from "./team";
import { ProjectProgressView } from "./project-progress";

interface DashboardPreviewProps {
  inView?: boolean;
}

const DashboardPreview: React.FC<DashboardPreviewProps> = ({ inView = true }) => {
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;

  const {
    currentStep,
    projectProgress,
    activeCard,
    cursorPosition,
    showCursor,
    completedTasks,
    currentView,
  } = useHeroAnimation(inView);

  const renderContent = () => {
    switch (currentView) {
      case "calendar": return <CalendarView />;
      case "team": return <TeamView />;
      default: return <ProjectProgressView progress={projectProgress} completedTasks={completedTasks} />;
    }
  };

  // Card Selector
  const SelectorCard = ({ type, icon: Icon, label }: { type: string, icon: any, label: string }) => (
    <motion.div
      className={`
        h-24 rounded-xl flex flex-col items-center justify-center 
        p-2 transition-all cursor-pointer relative border

        ${activeCard === type
          ? "bg-main/25 border-main/40 dark:bg-main/30 dark:border-main/40 scale-105 shadow-sm shadow-main/20"
          : currentView === type
          ? "bg-main/10 border-main/20 dark:bg-main/20 dark:border-main/20"
          : "bg-card/50 border-border hover:bg-main/10 hover:border-main/30"
        }
      `}
      animate={activeCard === type ? { scale: 1.05 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 250, damping: 22 }}
    >
      <Icon className="h-7 w-7 text-main mb-1" />
      <span className="text-xs text-foreground/90 font-medium">{label}</span>
    </motion.div>
  );

  return (
    <div className="relative w-full max-w-lg">

      {/* Subtle Ambient Glow (tone nhẹ, đồng bộ page) */}
      <motion.div
        className="absolute -inset-0.5 rounded-2xl 
                   bg-linear-to-br from-main/20 to-main/5 
                   dark:from-main/25 dark:to-main/10 opacity-20 blur-xl"
        animate={{ scale: [1, 1.03, 1], opacity: [0.15, 0.23, 0.15] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Main Card */}
      <div
        className="
          relative rounded-2xl 
          bg-card/95 dark:bg-card/90 
          p-6 backdrop-blur-xl overflow-hidden 
          border border-white/10 dark:border-white/5

          shadow-[0_6px_16px_rgba(0,0,0,0.10),0_18px_36px_rgba(0,0,0,0.08)]
        "
      >
        {/* Depth overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent dark:from-white/10" />

        {/* Cursor */}
        <AnimatePresence>
          {showCursor && isDesktop && (
            <motion.div
              className="absolute z-50 pointer-events-none"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, x: cursorPosition.x, y: cursorPosition.y }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <MousePointer className="h-5 w-5 text-main drop-shadow-sm rotate-6" />

              {[1, 3, 5, 7].includes(currentStep) && (
                <motion.div
                  className="absolute -inset-2 rounded-full border border-main/40"
                  initial={{ scale: 0.7, opacity: 0.8 }}
                  animate={{ scale: 1.9, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6 relative z-10">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-main flex items-center justify-center shadow-sm shadow-main/30">
                <Zap className="h-4 w-4 text-main-foreground" />
              </div>
              <span className="font-semibold text-foreground tracking-tight">Project Dashboard</span>
            </div>

            <div className="flex space-x-1.5 opacity-70">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
            </div>
          </div>

          {/* Selector */}
          <div className="grid grid-cols-3 gap-4 mt-3">
            <SelectorCard type="calendar" icon={CalendarIcon} label="Calendar" />
            <SelectorCard type="team" icon={Users} label="Team" />
            <SelectorCard type="tasks" icon={FileText} label="Tasks" />
          </div>

          {/* Dynamic Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <div className="flex gap-2 justify-end pt-4">
            <Button size="sm" variant="neutral">
              View Details
            </Button>
            <Button size="sm">
              Add Task
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardPreview;
