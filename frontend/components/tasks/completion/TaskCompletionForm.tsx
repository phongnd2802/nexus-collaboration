import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Loader2, Send, FileUp } from "lucide-react";
import TaskFileUpload from "../TaskFileUpload";
import TaskAttachments from "../TaskAttachments";
import { useTranslations } from "next-intl";

interface TaskCompletionFormProps {
  completionNote: string;
  deliverableFiles: any[];
  isSaving: boolean;
  onNoteChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onRemoveFile: (fileUrl: string) => void;
  setDeliverableFiles: (files: any[]) => void;
  onSubmit: () => void;
}

export default function TaskCompletionForm({
  completionNote,
  deliverableFiles,
  isSaving,
  onNoteChange,
  onRemoveFile,
  setDeliverableFiles,
  onSubmit,
}: TaskCompletionFormProps) {
  const t = useTranslations("TasksPage.form");
  return (
    <div className="space-y-4 bg-muted/30 p-4 rounded-md">
      <div className="space-y-2">
        <Label htmlFor="completion-note">{t("notes")}</Label>
        <Textarea
          id="completion-note"
          placeholder="Add details about the work done or upload deliverables"
          value={completionNote}
          onChange={onNoteChange}
          className="min-h-[120px] resize-y"
        />
      </div>

      <Separator className="my-4" />

      <div className="space-y-2">
        <Label className="flex items-center" htmlFor="deliverables">
          <FileUp className="h-4 w-4 mr-2 text-main" />
          {t("deliverables")}
        </Label>
        <p className="text-xs text-muted-foreground">
          {t("deliverables_description")}
        </p>

        {deliverableFiles.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">{t("current_deliverables")}</h4>
            <TaskAttachments
              files={deliverableFiles}
              onRemoveFile={onRemoveFile}
            />
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium mb-2">{t("add_deliverables")}</h4>
          <TaskFileUpload
            files={[]}
            setFiles={(newFiles) => {
              if (newFiles.length > 0) {
                setDeliverableFiles([...deliverableFiles, ...newFiles]);
              }
            }}
          />
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button
          onClick={onSubmit}
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("saving")}
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {t("save")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
