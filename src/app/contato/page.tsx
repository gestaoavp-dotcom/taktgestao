import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { LeadForm } from "@/components/lead-form";

export const metadata: Metadata = {
  title: "Fale com a TAKT Assessoria",
  description: "Deixe seu contato e a equipe TAKT fala com você sobre sua operação nos marketplaces.",
};

export default function ContatoPage() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-brand-gray px-4 py-10 sm:items-center">
      <div className="w-full max-w-md rounded-xl border border-navy/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <Logo height={36} />
        </div>
        <h1 className="text-xl font-bold text-navy">
          Vamos conversar sobre suas vendas nos marketplaces
        </h1>
        <p className="mb-6 mt-2 text-sm text-[#5B647E]">
          Deixe seu contato e nossa equipe fala com você pelo WhatsApp.
        </p>
        <LeadForm />
      </div>
    </div>
  );
}
