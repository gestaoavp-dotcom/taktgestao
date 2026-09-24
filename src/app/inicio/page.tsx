import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "TAKT Assessoria",
  description: "Assessoria para vender mais nos marketplaces.",
};

// Shown at "/" to anyone without a login (the middleware rewrites to it);
// a signed-in user at "/" gets the dashboard instead.
export default function InicioPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-gray px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-navy/10 bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo height={40} />
        </div>
        <h1 className="text-xl font-bold text-navy">Assessoria para marketplaces</h1>
        <p className="mb-8 mt-2 text-sm text-[#5B647E]">
          Quer vender mais no Mercado Livre, Shopee, Amazon e outros? Fale com a gente.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/contato"
            className="flex h-11 items-center justify-center rounded-lg bg-navy text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38]"
          >
            Quero falar com a TAKT
          </Link>
          <Link
            href="/calculadora"
            className="flex h-11 items-center justify-center rounded-lg bg-blue text-sm font-semibold text-white transition-colors hover:bg-[#1e4ed8]"
          >
            Calculadora TAKT
          </Link>
          <Link
            href="/login"
            className="flex h-11 items-center justify-center rounded-lg border-2 border-blue text-sm font-semibold text-blue transition-colors hover:bg-blue/5"
          >
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
