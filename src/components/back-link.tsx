import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink() {
  return (
    <Link
      href="/"
      className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#5B647E] transition-colors hover:text-navy"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </Link>
  );
}
