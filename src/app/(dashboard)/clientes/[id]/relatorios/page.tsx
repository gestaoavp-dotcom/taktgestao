import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/types";
import { distinctMarketplaces } from "@/lib/marketplaces";
import { buildMonthlyReport, REPORT_SECTIONS, type ReportSection } from "@/lib/report";
import { ReportOptions } from "@/components/report-options";
import { MonthlyReportView } from "@/components/monthly-report";

const ALL_SECTIONS = REPORT_SECTIONS.map((s) => s.value);

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function ClienteRelatoriosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string; plataforma?: string; secoes?: string; gerar?: string }>;
}) {
  const { id } = await params;
  const { mes, plataforma, secoes, gerar } = await searchParams;
  const supabase = await createClient();

  const [{ data: client }, { data: accounts }, { data: months }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle<Client>(),
    supabase.from("client_accounts").select("marketplace").eq("client_id", id),
    supabase
      .from("sales_reports")
      .select("report_month")
      .eq("client_id", id)
      .not("report_month", "is", null)
      .order("report_month", { ascending: false })
      .returns<{ report_month: string }[]>(),
  ]);

  if (!client) return null;

  const availableMonths = Array.from(new Set((months ?? []).map((m) => m.report_month)));
  const month = mes ?? availableMonths[0] ?? currentMonth();
  const marketplace = plataforma ?? "all";
  const sections = (secoes ? (secoes.split(",") as ReportSection[]) : ALL_SECTIONS).filter((s) =>
    ALL_SECTIONS.includes(s),
  );

  const generated = gerar === "1";
  const report = generated
    ? await buildMonthlyReport(supabase, id, {
        month,
        marketplace: marketplace === "all" ? undefined : marketplace,
        sections,
      })
    : null;

  return (
    <div>
      <ReportOptions
        month={month}
        marketplace={marketplace}
        sections={sections}
        availableMonths={availableMonths}
        clientMarketplaces={distinctMarketplaces(accounts ?? [])}
        generated={generated}
      />

      {report ? (
        <MonthlyReportView report={report} clientName={client.name} />
      ) : (
        <div className="rounded-lg bg-white py-16 text-center shadow-sm">
          <p className="text-sm text-[#5B647E]">
            Escolha o mês e a plataforma acima e clique em &quot;Gerar relatório&quot;.
          </p>
          {!availableMonths.length && (
            <p className="mt-2 text-xs text-[#94A0BD]">
              Nenhum documento importado ainda — comece por Dados → Importar documentos.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
