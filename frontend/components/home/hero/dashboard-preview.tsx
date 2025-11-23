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
  
  // Sử dụng hook tại đây để cô lập logic render
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

  // Helper cho Card Selector
  const SelectorCard = ({ type, icon: Icon, label }: { type: string, icon: any, label: string }) => (
    <motion.div
      className={`h-24 rounded-lg flex flex-col items-center justify-center p-2 transition-all cursor-pointer relative ${
        activeCard === type
          ? "bg-violet-200 dark:bg-violet-700/50 scale-105 shadow-lg"
          : currentView === type
          ? "bg-violet-100 dark:bg-violet-800/40"
          : "bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30"
      }`}
      animate={activeCard === type ? { scale: 1.05 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <Icon className="h-8 w-8 text-violet-500 dark:text-violet-400 mb-1" />
      <span className="text-xs text-violet-900 dark:text-violet-300 font-medium">{label}</span>
    </motion.div>
  );

  return (
    <div className="relative w-full max-w-lg">
      {/* Background Glow Effect */}
      <motion.div
        className="absolute -inset-0.5 rounded-2xl bg-linear-to-br from-violet-700 to-purple-600 opacity-30 blur-xl dark:from-violet-700/20 dark:to-purple-600/20"
        animate={{ scale: [1, 1.02, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
      />

      <div className="relative rounded-2xl bg-card dark:bg-card/90 p-6 shadow-2xl backdrop-blur-sm overflow-hidden">
        {/* Animated Cursor */}
        <AnimatePresence>
          {showCursor && isDesktop && (
            <motion.div
              className="absolute z-50 pointer-events-none"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, x: cursorPosition.x, y: cursorPosition.y }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <MousePointer className={`h-5 w-5 text-violet-700 dark:text-violet-200 drop-shadow-lg rotate-6 ${[0, 2, 4, 6].includes(currentStep) ? "cursor-pointer" : ""}`} />
              {[1, 3, 5, 7].includes(currentStep) && (
                <motion.div
                  className="absolute -inset-2 rounded-full border-2 border-violet-400"
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6">
           {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-md bg-violet-700 flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-medium text-foreground">Project Dashboard</span>
            </div>
            <div className="flex space-x-1">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
          </div>

          {/* Grid Selectors */}
          <div className="grid grid-cols-3 gap-4">
            <SelectorCard type="calendar" icon={CalendarIcon} label="Calendar" />
            <SelectorCard type="team" icon={Users} label="Team" />
            <SelectorCard type="tasks" icon={FileText} label="Tasks" />
          </div>

          {/* Dynamic View Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>

          {/* Footer Actions */}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="text-violet-700 dark:text-violet-400 border-violet-200 hover:bg-violet-50">
              View Details
            </Button>
            <Button size="sm" className="bg-violet-700 text-white hover:bg-violet-900">
              Add Task
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPreview;