import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

const FallbackAlert: React.FC = () => {
  const t = useTranslations("MessagesPage.fallbackAlert");
  return (
    <Alert variant="default" className="m-2 bg-yellow-50 dark:bg-yellow-900/20">
      <Info className="h-4 w-4" />
      <AlertDescription className="text-xs">{t("message")}</AlertDescription>
    </Alert>
  );
};

export default FallbackAlert;
