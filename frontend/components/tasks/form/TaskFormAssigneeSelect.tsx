import { Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TaskFormAssigneeSelectProps {
  assigneeId: string;
  projectId: string;
  availableMembers: any[];
  handleSelectChange: (name: string, value: string) => void;
}

export function TaskFormAssigneeSelect({
  assigneeId,
  projectId,
  availableMembers,
  handleSelectChange,
}: TaskFormAssigneeSelectProps) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor="assignee"
        className="text-base font-medium flex items-center"
      >
        <Users className="h-4 w-4 mr-2 text-violet-600" />
        Assignee
      </Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Select
                value={assigneeId}
                onValueChange={(value) =>
                  handleSelectChange("assigneeId", value)
                }
                disabled={!projectId || availableMembers.length === 0}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Assign to team member" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center">
                        <Avatar className="h-6 w-6 mr-2">
                          {member.image ? (
                            <AvatarImage
                              src={member.image}
                              alt={member.name}
                              className="object-cover"
                            />
                          ) : (
                            <AvatarFallback>
                              {member.name
                                ? member.name.charAt(0).toUpperCase()
                                : "U"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span>{member.name || "Unnamed User"}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TooltipTrigger>
          {!projectId && (
            <TooltipContent>
              <p>Select a project first to see available team members</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      {projectId && availableMembers.length === 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          No team members available in this project
        </p>
      )}
    </div>
  );
}
