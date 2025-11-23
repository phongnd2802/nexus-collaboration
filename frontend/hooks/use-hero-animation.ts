import { useState, useEffect } from "react";

export const useHeroAnimation = (isActive: boolean) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [projectProgress, setProjectProgress] = useState(75);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [showCursor, setShowCursor] = useState(false);
  const [completedTasks, setCompletedTasks] = useState([true, true, false]);
  const [currentView, setCurrentView] = useState("tasks");

  useEffect(() => {
    if (!isActive) return;

    const isChromeLike = !navigator.userAgent.includes("Firefox");
    // Coordinates config
    const CONFIG = {
      taskCheckboxY: isChromeLike ? 315 : 355,
      taskCheckboxX: isChromeLike ? 20 : 25,
      taskCardX: isChromeLike ? 430 : 460,
      calendarCardX: isChromeLike ? 110 : 120,
      calendarCardY: isChromeLike ? 120 : 130,
    };

    const animationSequence = [
      { step: 0, x: CONFIG.calendarCardX, y: CONFIG.calendarCardY, duration: 1000, target: "calendar" },
      { step: 1, x: CONFIG.calendarCardX, y: CONFIG.calendarCardY, duration: 500, target: "calendar" }, // Click
      { step: 2, x: 210, y: 130, duration: 1200, target: "team" },
      { step: 3, x: 210, y: 130, duration: 500, target: "team" }, // Click
      { step: 4, x: CONFIG.taskCardX, y: 130, duration: 1200, target: "tasks" },
      { step: 5, x: CONFIG.taskCardX, y: 130, duration: 500, target: "tasks" }, // Click
      { step: 6, x: CONFIG.taskCheckboxX, y: CONFIG.taskCheckboxY, duration: 1000, target: "task" },
      { step: 7, x: CONFIG.taskCheckboxX, y: CONFIG.taskCheckboxY, duration: 500, target: "task" }, // Click Checkbox
      { step: 8, x: 40, y: 305, duration: 1500, target: null }, // Reset
    ];

    let timeoutId: NodeJS.Timeout;
    let currentIndex = 0;

    const runAnimation = () => {
      if (currentIndex >= animationSequence.length) return;

      const current = animationSequence[currentIndex];
      setShowCursor(currentIndex < animationSequence.length - 1);
      setCursorPosition({ x: current.x, y: current.y });
      setCurrentStep(current.step);

      // State update logic based on steps
      switch (current.step) {
        case 1:
          setActiveCard("calendar");
          setTimeout(() => { setCurrentView("calendar"); setActiveCard(null); }, 300);
          break;
        case 3:
          setActiveCard("team");
          setTimeout(() => { setCurrentView("team"); setActiveCard(null); }, 300);
          break;
        case 5:
          setActiveCard("tasks");
          setTimeout(() => { setCurrentView("tasks"); setActiveCard(null); }, 300);
          break;
        case 7:
          setProjectProgress(100);
          setTimeout(() => setCompletedTasks([true, true, true]), 200);
          break;
        case 8:
          setTimeout(() => {
            setCompletedTasks([true, true, false]);
            setProjectProgress(75);
            setCurrentView("tasks");
            currentIndex = 0;
            runAnimation();
          }, 2000);
          return;
      }

      currentIndex++;
      timeoutId = setTimeout(runAnimation, current.duration);
    };

    timeoutId = setTimeout(runAnimation, 1000);
    return () => clearTimeout(timeoutId);
  }, [isActive]);

  return {
    currentStep,
    projectProgress,
    activeCard,
    cursorPosition,
    showCursor,
    completedTasks,
    currentView,
  };
};