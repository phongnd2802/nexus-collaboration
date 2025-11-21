import { Zap, User } from "lucide-react";

export const FEATURE_MENU_ITEMS = [
  {
    label: "Project Management",
    description: "Organize your work",
    icon: Zap,
    sectionId: "features",
  },
  {
    label: "Team Collaboration",
    description: "Work together seamlessly",
    icon: User,
    sectionId: "features", // Example pointing to same section
  },
];