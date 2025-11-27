import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2, Save } from "lucide-react";

interface TaskFormActionsProps {
  mode: "create" | "edit";
  isSubmitting: boolean;
  isValid: boolean;
  onCancel: () => void;
}

export function TaskFormActions({
  mode,
  isSubmitting,
  isValid,
  onCancel,
}: TaskFormActionsProps) {
  return (
    <div className="pt-2">
      <Separator className="mb-4" />
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
        <Button
          type="button"
          variant="neutral"
          onClick={onCancel}
          className="order-2 sm:order-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-700 text-white order-1 sm:order-2"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === "create" ? "Creating Task..." : "Saving Changes..."}
            </>
          ) : (
            <>
              {mode === "create" ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Create Task
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
