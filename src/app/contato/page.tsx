import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { Logo } from "@/components/logo";
import { LeadForm } from "@/components/lead-form";

export const metadata: Metadata = {
  title: "Fale com a TAKT Assessoria",
  description: "Deixe seu contato e a equipe TAKT fala com você sobre sua operação nos marketplaces.",
};

export default async function ContatoPage({
  searchParams,
}: {
  searchParams: Promise<{ para?: string }>;
}) {
  const { para } = await searchParams;
  const toCalculator = para === "calculadora";

  return (
    <div className="flex min-h-screen items-start justify-center bg-surface px-4 py-10 sm:items-center">
      <div className="lift w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-sm sm:p-8">
        <BackLink />
        <div className="mb-6">
          <Logo height={36} />
        </div>
        <h1 className="text-xl font-bold text-ink">
          Vamos conversar sobre suas vendas nos marketplaces
        </h1>
        <p className="mb-6 mt-2 text-sm text-ink-2">
          Deixe seu contato e nossa equipe fala com você pelo WhatsApp.
        </p>
        <LeadForm toCalculator={toCalculator} />
      </div>
    </div>
  );
}
