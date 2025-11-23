import { useTaskCompletion } from "@/hooks/useTaskCompletion";
import TaskCompletionHeader from "./completion/TaskCompletionHeader";
import TaskCompletionView from "./completion/TaskCompletionView";
import TaskCompletionForm from "./completion/TaskCompletionForm";

interface TaskCompletionProps {
  taskId: string;
  isAssignee: boolean;
  existingNote?: string;
  onNoteUpdated: (note: string) => void;
  deliverables?: any[];
}

export default function TaskCompletion({
  taskId,
  isAssignee,
  existingNote,
  onNoteUpdated,
  deliverables = [],
}: TaskCompletionProps) {
  const {
    completionNote,
    isSaving,
    isEditing,
    deliverableFiles,
    setDeliverableFiles,
    handleNoteChange,
    handleRemoveFile,
    handleSubmit,
    handleEnterEditMode,
    handleCancelEdit,
  } = useTaskCompletion({
    taskId,
    isAssignee,
    existingNote,
    onNoteUpdated,
    deliverables,
  });

  const hasExistingData = !!(
    existingNote ||
    (deliverables && deliverables.length > 0)
  );

  return (
    <div className="space-y-4">
      <TaskCompletionHeader
        isAssignee={isAssignee}
        isEditing={isEditing}
        hasExistingData={hasExistingData}
        onEnterEditMode={handleEnterEditMode}
        onCancelEdit={handleCancelEdit}
      />

      {!isEditing ? (
        <TaskCompletionView
          existingNote={existingNote}
          deliverables={deliverables}
        />
      ) : (
        <TaskCompletionForm
          completionNote={completionNote}
          deliverableFiles={deliverableFiles}
          isSaving={isSaving}
          onNoteChange={handleNoteChange}
          onRemoveFile={handleRemoveFile}
          setDeliverableFiles={setDeliverableFiles}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
