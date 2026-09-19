import { Loader2 } from "lucide-react";

export function PageLoading() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue" />
    </div>
  );
}
