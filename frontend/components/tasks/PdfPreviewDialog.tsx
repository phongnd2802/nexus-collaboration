"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string | null;
  fileName: string;
  onDownload: () => void;
}

export default function PdfPreviewDialog({
  open,
  onOpenChange,
  pdfUrl,
  fileName,
  onDownload,
}: PdfPreviewDialogProps) {
  const t = useTranslations("TaskDetailPage");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open && pdfUrl) {
      setIsLoading(true);
      // Give iframe a moment to start loading
      const timer = setTimeout(() => setIsLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [open, pdfUrl]);

  const handleDownload = () => {
    onDownload();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[70vw] w-[70vw] h-screen max-h-screen flex flex-col p-3">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl">{t("pdf_preview") || "PDF Preview"}</DialogTitle>
          <DialogDescription>
            {t("pdf_preview_description") || "Preview before downloading"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative border rounded-md overflow-auto bg-gray-50">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}
          {pdfUrl && (
            <iframe
              src={`${pdfUrl}#zoom=60&toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full"
              title="PDF Preview"
              onLoad={() => setIsLoading(false)}
            />
          )}
        </div>

        <DialogFooter className="flex justify-between items-center sm:justify-between pt-3">
          <Button
            variant="neutral"
            onClick={() => onOpenChange(false)}
            className="flex items-center"
          >
            <X className="h-4 w-4 mr-2" />
            {t("cancel") || "Cancel"}
          </Button>
          <Button
            onClick={handleDownload}
            className="flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            {t("download_pdf") || "Download PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
