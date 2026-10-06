import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink() {
  return (
    <Link
      href="/"
      className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 transition-colors hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </Link>
  );
}
