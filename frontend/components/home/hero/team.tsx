import React from "react";
import { Users, Shield, Edit3, User } from "lucide-react";

const TEAM_MEMBERS = [
  { name: "Sarah Johnson", role: "Admin", icon: Shield, status: "online" },
  { name: "Mike Chen", role: "Editor", icon: Edit3, status: "online" },
  { name: "Emma Davis", role: "Member", icon: User, status: "away" },
];

export const TeamView = () => (
  <div
    className="
      h-40 rounded-lg bg-card/80 dark:bg-card/70 p-3 overflow-hidden
      border border-white/10 dark:border-white/5
      shadow-[0_4px_12px_rgba(0,0,0,0.08),0_10px_25px_rgba(0,0,0,0.06)]
      backdrop-blur-xl
      transition-all duration-150 hover:shadow-lg hover:border-main/30
    "
  >
    {/* Header */}
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-sm font-medium text-foreground flex items-center">
        <Users className="h-3 w-3 mr-1 text-main" /> Team Members
      </h3>
      <span className="text-xs text-muted-foreground">{TEAM_MEMBERS.length} members</span>
    </div>

    {/* Members List */}
    <div className="space-y-2.5">
      {TEAM_MEMBERS.map((member, i) => {
        const statusColor =
          member.status === "online"
            ? "bg-green-500 dark:bg-green-400"
            : member.status === "away"
            ? "bg-yellow-400 dark:bg-yellow-300"
            : "bg-gray-400 dark:bg-gray-500";

        const iconBg =
          member.role === "Admin"
            ? "bg-main/80 dark:bg-main/70"
            : member.role === "Editor"
            ? "bg-main/60 dark:bg-main/50"
            : "bg-muted-foreground/30 dark:bg-muted-foreground/20";

        return (
          <div
            key={i}
            className="
              flex items-center justify-between rounded hover:bg-main/10 dark:hover:bg-main/20 transition-colors
            "
          >
            <div className="flex items-center">
              <div
                className={`h-6 w-6 rounded-full ${iconBg} flex items-center justify-center mr-2 shadow-sm`}
              >
                <member.icon className="h-3 w-3 text-white" />
              </div>
              <div>
                <div className="text-xs font-medium text-foreground">{member.name}</div>
                <div className="text-xs text-muted-foreground">{member.role}</div>
              </div>
            </div>
            <div className={`h-2 w-2 rounded-full ${statusColor} shadow-inner`}></div>
          </div>
        );
      })}
    </div>
  </div>
);
