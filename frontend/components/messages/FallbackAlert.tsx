import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const FallbackAlert: React.FC = () => {
  return (
    <Alert variant="default" className="m-2 bg-yellow-50 dark:bg-yellow-900/20">
      <Info className="h-4 w-4" />
      <AlertDescription className="text-xs">
        Real-time chat is currently unavailable. Using polling instead.
      </AlertDescription>
    </Alert>
  );
};

export default FallbackAlert;
