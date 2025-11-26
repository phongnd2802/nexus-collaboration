import { useTaskCompletion } from "@/hooks/useTaskCompletion";
import TaskCompletionHeader from "./completion/TaskCompletionHeader";
import TaskCompletionView from "./completion/TaskCompletionView";
import TaskCompletionForm from "./completion/TaskCompletionForm";

interface TaskCompletionProps {
  taskId: string;
  isAssignee: boolean;
  isAdmin?: boolean;
  existingNote?: string;
  onNoteUpdated: (note: string, deliverables: any[]) => void;
  deliverables?: any[];
}

export default function TaskCompletion({
  taskId,
  isAssignee,
  isAdmin = false,
  existingNote,
  onNoteUpdated,
  deliverables = [],
}: TaskCompletionProps) {
  // Allow edit if user is assignee or project admin
  const canEdit = isAssignee || isAdmin;

  const {
    completionNote,
    isSaving,
    isEditing,
    hasSavedCompletion,
    deliverableFiles,
    setDeliverableFiles,
    handleNoteChange,
    handleRemoveFile,
    handleSubmit,
    handleEnterEditMode,
    handleCancelEdit,
  } = useTaskCompletion({
    taskId,
    canEdit,
    existingNote,
    onNoteUpdated,
    deliverables,
  });

  return (
    <div className="space-y-4">
      <TaskCompletionHeader
        canEdit={canEdit}
        isEditing={isEditing}
        hasExistingData={hasSavedCompletion}
        onEnterEditMode={handleEnterEditMode}
        onCancelEdit={handleCancelEdit}
      />

      {!isEditing ? (
        <TaskCompletionView
          existingNote={completionNote}
          deliverables={deliverableFiles}
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
