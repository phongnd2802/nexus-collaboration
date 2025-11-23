import React from "react";
import { Users, Shield, Edit3, User } from "lucide-react";

const TEAM_MEMBERS = [
  { name: "Sarah Johnson", role: "Admin", icon: Shield, bg: "bg-violet-600", status: "bg-green-500" },
  { name: "Mike Chen", role: "Editor", icon: Edit3, bg: "bg-blue-600", status: "bg-green-500" },
  { name: "Emma Davis", role: "Member", icon: User, bg: "bg-gray-600", status: "bg-yellow-500" },
];

export const TeamView = () => (
  <div className="h-40 rounded-lg bg-violet-50 dark:bg-violet-900/20 p-3 overflow-hidden">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-sm font-medium text-foreground flex items-center">
        <Users className="h-3 w-3 mr-1" /> Team Members
      </h3>
      <span className="text-xs text-violet-700 dark:text-violet-400">3 members</span>
    </div>
    <div className="space-y-2.5">
      {TEAM_MEMBERS.map((member, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`h-6 w-6 rounded-full ${member.bg} flex items-center justify-center mr-2`}>
              <member.icon className="h-3 w-3 text-white" />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">{member.name}</div>
              <div className="text-xs text-muted-foreground">{member.role}</div>
            </div>
          </div>
          <div className={`h-2 w-2 rounded-full ${member.status}`}></div>
        </div>
      ))}
    </div>
  </div>
);