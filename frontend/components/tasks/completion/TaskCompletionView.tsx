import TaskAttachments from "../TaskAttachments";

interface TaskCompletionViewProps {
  existingNote?: string;
  deliverables?: any[];
}

export default function TaskCompletionView({
  existingNote,
  deliverables,
}: TaskCompletionViewProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <span className="text-green-600"></span> Notes
        </h4>
        {existingNote ? (
          <p className="whitespace-pre-wrap">{existingNote}</p>
        ) : (
          <p className="text-muted-foreground italic">No notes provided</p>
        )}
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <span className="text-green-600"></span> Deliverables
        </h4>
        {deliverables && deliverables.length > 0 ? (
          <TaskAttachments files={deliverables} />
        ) : (
          <p className="text-muted-foreground italic">No files uploaded</p>
        )}
      </div>
    </div>
  );
}
