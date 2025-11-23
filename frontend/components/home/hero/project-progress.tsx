import React from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

interface Props {
  progress: number;
  completedTasks: boolean[];
}

export const ProjectProgressView: React.FC<Props> = ({ progress, completedTasks }) => (
  <div className="h-40 rounded-lg bg-violet-50 dark:bg-violet-900/20 p-4">
    <div className="flex justify-between items-center mb-3">
      <h3 className="font-medium text-foreground">Project Progress</h3>
      <motion.span
        className="text-sm text-violet-700 dark:text-violet-400"
        key={progress}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.3 }}
      >
        {progress}%
      </motion.span>
    </div>
    <div className="h-2 w-full bg-violet-100 dark:bg-violet-800/50 rounded-full mb-4">
      <motion.div
        className="h-2 rounded-full bg-violet-700 dark:bg-violet-500"
        initial={{ width: "75%" }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
    </div>
    <div className="space-y-2">
      <div className="flex items-center">
        <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
        <span className="text-sm text-muted-foreground">Research completed</span>
      </div>
      <div className="flex items-center">
        <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
        <span className="text-sm text-muted-foreground">Design phase completed</span>
      </div>
      <div className="flex items-center relative">
        <motion.div
          animate={completedTasks[2] ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {completedTasks[2] ? (
            <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
          ) : (
            <div className="h-4 w-4 border-2 border-violet-300 dark:border-violet-600 rounded-full mr-2"></div>
          )}
        </motion.div>
        <span className="text-sm text-muted-foreground">
          Development {completedTasks[2] ? "completed" : "in progress"}
          {completedTasks[2] && <span className="text-xs text-green-500 ml-1">Task Done!</span>}
        </span>
      </div>
    </div>
  </div>
);