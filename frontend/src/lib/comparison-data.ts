export type FeatureValue = "full" | "basic" | "partial" | false;

export interface ComparisonRow {
  featureKey: string;
  featureTitleKey: string;
  featureDescKey: string;
  nexus: FeatureValue;
  slack: FeatureValue;
  notion: FeatureValue;
  monday: FeatureValue;
  clickup: FeatureValue;
}

export const comparisonDataKeys: ComparisonRow[] = [
  { featureKey: "chatMessaging", featureTitleKey: "comparison.features.chatMessaging.title", featureDescKey: "comparison.features.chatMessaging.desc", nexus: "full", slack: "full", notion: false, monday: "basic", clickup: "basic" },
  { featureKey: "videoConferencing", featureTitleKey: "comparison.features.videoConferencing.title", featureDescKey: "comparison.features.videoConferencing.desc", nexus: "full", slack: "basic", notion: false, monday: false, clickup: false },
  { featureKey: "projectManagement", featureTitleKey: "comparison.features.projectManagement.title", featureDescKey: "comparison.features.projectManagement.desc", nexus: "full", slack: false, notion: "basic", monday: "full", clickup: "full" },
  { featureKey: "fileStorage", featureTitleKey: "comparison.features.fileStorage.title", featureDescKey: "comparison.features.fileStorage.desc", nexus: "full", slack: "partial", notion: "full", monday: "full", clickup: "full" },
  { featureKey: "notes", featureTitleKey: "comparison.features.notes.title", featureDescKey: "comparison.features.notes.desc", nexus: "full", slack: false, notion: "full", monday: "basic", clickup: "full" },
  { featureKey: "calendar", featureTitleKey: "comparison.features.calendar.title", featureDescKey: "comparison.features.calendar.desc", nexus: "full", slack: "partial", notion: "basic", monday: "full", clickup: "full" },
  { featureKey: "aiAssistant", featureTitleKey: "comparison.features.aiAssistant.title", featureDescKey: "comparison.features.aiAssistant.desc", nexus: "full", slack: "partial", notion: "full", monday: "full", clickup: "full" },
  { featureKey: "timeTracking", featureTitleKey: "comparison.features.timeTracking.title", featureDescKey: "comparison.features.timeTracking.desc", nexus: "full", slack: false, notion: false, monday: "full", clickup: "full" },
  { featureKey: "search", featureTitleKey: "comparison.features.search.title", featureDescKey: "comparison.features.search.desc", nexus: "full", slack: "full", notion: "full", monday: "full", clickup: "full" },
  { featureKey: "freePlan", featureTitleKey: "comparison.features.freePlan.title", featureDescKey: "comparison.features.freePlan.desc", nexus: "full", slack: "full", notion: "full", monday: "full", clickup: "full" }
];

export interface PricingInfo {
  platform: string;
  monthlyPrice: string;
  noteKey?: string;
}

export const pricingData: Record<string, PricingInfo> = {
  nexus: { platform: "Nexus", monthlyPrice: "Free - $10", noteKey: "comparison.pricingNotes.nexus" },
  slack: { platform: "Slack", monthlyPrice: "$8 - $15", noteKey: "comparison.pricingNotes.slack" },
  notion: { platform: "Notion", monthlyPrice: "$8 - $15", noteKey: "comparison.pricingNotes.notion" },
  monday: { platform: "Monday.com", monthlyPrice: "$9 - $19", noteKey: "comparison.pricingNotes.monday" },
  clickup: { platform: "ClickUp", monthlyPrice: "$7 - $19", noteKey: "comparison.pricingNotes.clickup" }
};

// Cost comparison for tool stack vs Nexus
export const toolStackComparison = {
  separateTools: {
    items: [
      { name: "Slack (Standard)", price: 8 },
      { name: "Zoom (Pro)", price: 15 },
      { name: "Notion (Plus)", price: 10 },
      { name: "Asana (Premium)", price: 14 }
    ],
    total: 47,
    label: "4 Separate Tools"
  },
  nexus: {
    price: 10,
    label: "All in Nexus",
    savings: 37,
    savingsPercent: 79
  }
};

// Legacy data export for backward compatibility
export type ComparisonRowLegacy = {
  feature: string;
  nexus: FeatureValue;
  slack: FeatureValue;
  notion: FeatureValue;
  monday: FeatureValue;
  clickup: FeatureValue;
  desc: string;
};

export const comparisonData: ComparisonRowLegacy[] = [
  { feature: "Real-Time Chat & Messaging", nexus: "full", slack: "full", notion: false, monday: "basic", clickup: "basic", desc: "Team channels, DMs, threads, @mentions" },
  { feature: "HD Video Conferencing", nexus: "full", slack: "basic", notion: false, monday: false, clickup: false, desc: "Built-in video calls with screen sharing" },
  { feature: "Project Management", nexus: "full", slack: false, notion: "basic", monday: "full", clickup: "full", desc: "Kanban boards, Gantt charts, sprints" },
  { feature: "File Storage & Management", nexus: "full", slack: "partial", notion: "full", monday: "full", clickup: "full", desc: "Cloud storage with version control" },
  { feature: "Notes & Documentation", nexus: "full", slack: false, notion: "full", monday: "basic", clickup: "full", desc: "Block-based editor with templates" },
  { feature: "Calendar & Scheduling", nexus: "full", slack: "partial", notion: "basic", monday: "full", clickup: "full", desc: "Smart scheduling with sync" },
  { feature: "AI Assistant", nexus: "full", slack: "partial", notion: "full", monday: "full", clickup: "full", desc: "ChatGPT-powered for all features" },
  { feature: "Time Tracking", nexus: "full", slack: false, notion: false, monday: "full", clickup: "full", desc: "Built-in project time tracking" },
  { feature: "Search Across All Content", nexus: "full", slack: "full", notion: "full", monday: "full", clickup: "full", desc: "AI-powered universal search" },
  { feature: "Free Plan Available", nexus: "full", slack: "full", notion: "full", monday: "full", clickup: "full", desc: "Fully-featured free tier" }
];
