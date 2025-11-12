
import { Loader2 } from "lucide-react";


export const LoadingForm = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="grow">
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-violet-700" />
        </div>
      </main>
    </div>
  );
}

