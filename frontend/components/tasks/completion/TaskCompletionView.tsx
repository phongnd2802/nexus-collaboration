import TaskAttachments from "../TaskAttachments";

interface TaskCompletionViewProps {
  existingNote?: string;
  deliverables?: any[];
}

export default function TaskCompletionView({
  existingNote,
  deliverables,
}: TaskCompletionViewProps) {
  if (!existingNote && (!deliverables || deliverables.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-4">
      {existingNote && (
        <div>
          <h4 className="text-sm font-medium mb-2">Note</h4>
          <div className="bg-muted/50 p-4 rounded-md">
            <p className="whitespace-pre-wrap">{existingNote}</p>
          </div>
        </div>
      )}

      {deliverables && deliverables.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Deliverables</h4>
          <TaskAttachments files={deliverables} />
        </div>
      )}
    </div>
  );
}
