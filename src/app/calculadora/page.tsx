import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { Logo } from "@/components/logo";
import { LEAD_COOKIE } from "@/lib/lead-access";

export const metadata: Metadata = {
  title: "Nossa Calculadora | TAKT Assessoria",
};

export default async function CalculadoraPage() {
  if (!(await cookies()).get(LEAD_COOKIE)) redirect("/contato?para=calculadora");

  return (
    <div className="flex min-h-screen items-start justify-center bg-brand-gray px-4 py-10 sm:items-center">
      <div className="w-full max-w-md rounded-xl border border-navy/10 bg-white p-6 shadow-sm sm:p-8">
        <BackLink />
        <div className="mb-6">
          <Logo height={36} />
        </div>
        <h1 className="text-xl font-bold text-navy">Nossa Calculadora</h1>
      </div>
    </div>
  );
}
