import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  className?: string;
}

export function LoadingState({ className }: LoadingStateProps) {
  return (
    <div className={`flex flex-col min-h-screen ${className}`}>
      <div className="grow flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-main" />
      </div>
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-main" />
    </div>
  );
}
