import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/types/index";
import { getInitials } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface TaskAssigneeSelectProps {
  assignee: User | null;
  isEditing: boolean;
  editedTask: any;
  availableMembers: User[];
  handleAssigneeChange: (value: string) => void;
}

export default function TaskAssigneeSelect({
  assignee,
  isEditing,
  editedTask,
  availableMembers,
  handleAssigneeChange,
}: TaskAssigneeSelectProps) {
  const t = useTranslations("TaskDetailPage");
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground">{t("assignee")}</h3>
      {isEditing ? (
        <Select
          value={editedTask.assigneeId || "unassigned"}
          onValueChange={handleAssigneeChange}
        >
          <SelectTrigger className="h-9 mt-1">
            <SelectValue placeholder={t("assignToTeamMember")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">{t("unassigned")}</SelectItem>
            {availableMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                <div className="flex items-center">
                  <Avatar className="h-5 w-5 mr-2">
                    {member.image ? (
                      <AvatarImage src={member.image} alt={member.name ?? ""} />
                    ) : (
                      <AvatarFallback className="text-xs">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span>{member.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <>
          {assignee ? (
            <div className="flex items-center mt-1">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage
                  src={assignee.image ?? ""}
                  alt={assignee.name ?? ""}
                />
                <AvatarFallback className="bg-main text-white text-xs">
                  {getInitials(assignee.name)}
                </AvatarFallback>
              </Avatar>
              <span>{assignee.name}</span>
            </div>
          ) : (
            <p className="text-muted-foreground mt-1 italic">{t("unassigned")}</p>
          )}
        </>
      )}
    </div>
  );
}
