import React from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  progress: number;
  completedTasks: boolean[];
}

export const ProjectProgressView: React.FC<Props> = ({
  progress,
  completedTasks,
}) => {
  const t = useTranslations("HomePage.hero.preview.projectProgress");
  const tasks = ["research", "design", "development"];

  return (
    <div
      className="
        h-40 rounded-lg bg-card/80 dark:bg-card/70 p-4
        shadow-[0_8px_20px_rgba(0,0,0,0.12),0_20px_45px_rgba(0,0,0,0.10)]
        border border-white/10 dark:border-white/5
        backdrop-blur-xl
      "
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-foreground">{t("title")}</h3>
        <motion.span
          className="text-sm text-main"
          key={progress}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.3 }}
        >
          {progress}%
        </motion.span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full bg-muted-foreground/20 rounded-full mb-4">
        <motion.div
          className="h-2 rounded-full bg-main"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        {tasks.map((taskKey, i) => (
          <div key={i} className="flex items-center relative">
            <motion.div
              animate={completedTasks[i] ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {completedTasks[i] ? (
                <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
              ) : (
                <div className="h-4 w-4 border-2 border-muted-foreground/30 dark:border-muted-foreground/50 rounded-full mr-2"></div>
              )}
            </motion.div>
            <span className="text-sm text-foreground">
              {t(`tasks.${taskKey}`)}{" "}
              {completedTasks[i] && i === 2 && (
                <span className="text-xs text-green-500 ml-1">
                  {t("taskDone")}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
