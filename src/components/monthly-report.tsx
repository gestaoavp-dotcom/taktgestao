import { AlertTriangle, TrendingUp } from "lucide-react";
import type { DayDetail, MonthlyReport } from "@/lib/report";
import { MARKETPLACE_LABEL } from "@/lib/marketplaces";
import { formatCurrency } from "@/lib/sales-summary";
import { CHANGE_CATEGORY_LABEL, CHANGE_STATUS_LABEL } from "@/lib/client-changes";

function pct(value: number) {
  return `${value.toFixed(2).replace(".", ",")}%`;
}

function delta(current: number, previous: number) {
  if (previous <= 0) return null;
  const change = ((current - previous) / previous) * 100;
  return { change, up: change >= 0 };
}

function int(value: number) {
  return Math.round(value).toLocaleString("pt-BR");
}

function Metric({
  label,
  value,
  previous,
  previousLabel,
}: {
  label: string;
  value: string;
  previous?: number | null;
  previousLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-navy/[.08] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-navy">{value}</p>
      {previous != null && (
        <p
          className={`mt-1 text-xs font-semibold ${previous >= 0 ? "text-green-700" : "text-red-600"}`}
        >
          {previous >= 0 ? "▲" : "▼"} {Math.abs(previous).toFixed(1).replace(".", ",")}%
          <span className="font-normal text-[#94A0BD]"> {previousLabel ?? "vs mês anterior"}</span>
        </p>
      )}
    </div>
  );
}

function fmtDay(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** A standout day with the actions that could explain it. */
function DayCard({ day, tone }: { day: DayDetail; tone: "alta" | "baixa" }) {
  return (
    <div
      className={`break-inside-avoid rounded-lg border p-4 ${
        tone === "alta" ? "border-green-200 bg-green-50/50" : "border-orange-200 bg-orange-50/40"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-lg font-bold text-navy">{fmtDay(day.date)}</span>
        <span className="text-sm font-semibold text-navy">{formatCurrency(day.revenue)}</span>
      </div>
      <p className="text-[11px] text-[#94A0BD]">
        {day.orders} {day.orders === 1 ? "pedido" : "pedidos"} ·{" "}
        {day.vsAverage >= 0 ? "+" : ""}
        {day.vsAverage.toFixed(0)}% vs média
      </p>

      <div className="mt-3 border-t border-navy/[.06] pt-2">
        {day.actions.length ? (
          <ul className="flex flex-col gap-1.5">
            {day.actions.map((a, i) => (
              <li key={i} className="text-xs text-[#5B647E]">
                <span
                  className={`mr-1.5 rounded px-1 py-0.5 text-[10px] font-semibold ${
                    a.sameDay ? "bg-navy text-white" : "bg-brand-gray text-[#5B647E]"
                  }`}
                >
                  {a.sameDay ? "no dia" : fmtDay(a.date)}
                </span>
                {a.description}
                {a.owner ? ` — ${a.owner}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[#94A0BD]">Nenhuma ação registrada nesse dia ou na véspera.</p>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-display text-lg font-bold text-navy">{title}</h2>
      {children}
    </section>
  );
}

export function MonthlyReportView({
  report,
  clientName,
}: {
  report: MonthlyReport;
  clientName: string;
}) {
  const { sales, products, ads, traffic, daily, changes, notes } = report;
  const revenueDelta = delta(sales.revenue, sales.prevRevenue);
  const ordersDelta = delta(sales.orders, sales.prevOrders);
  const ticketDelta = delta(sales.ticket, sales.prevTicket);

  return (
    <div className="flex flex-col gap-5">
      <header className="rounded-lg bg-navy p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
          Relatório mensal
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold">{clientName}</h1>
        <p className="mt-1 text-sm text-white/80">
          {report.monthLabel}
          {report.marketplace
            ? ` · ${MARKETPLACE_LABEL[report.marketplace] ?? report.marketplace}`
            : " · todas as plataformas"}
        </p>
      </header>

      {notes.length > 0 && (
        <Section title="Leitura do mês">
          <ul className="flex flex-col gap-2.5">
            {notes.map((note, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                {note.kind === "alerta" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#c2410c]" />
                ) : (
                  <TrendingUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-700" />
                )}
                <span className="text-[#5B647E]">{note.text}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Vendas">
        <div className="grid grid-cols-3 gap-4">
          <Metric
            label="Faturamento"
            value={formatCurrency(sales.revenue)}
            previous={revenueDelta?.change}
          />
          <Metric label="Pedidos" value={int(sales.orders)} previous={ordersDelta?.change} />
          <Metric
            label="Ticket médio"
            value={formatCurrency(sales.ticket)}
            previous={ticketDelta?.change}
          />
        </div>

        {sales.byMarketplace.length > 1 && (
          <table className="mt-5 w-full text-left text-sm">
            <thead className="bg-brand-gray">
              <tr>
                <th className="px-4 py-2 font-semibold text-navy">Plataforma</th>
                <th className="px-4 py-2 text-right font-semibold text-navy">Faturamento</th>
                <th className="px-4 py-2 text-right font-semibold text-navy">Pedidos</th>
                <th className="px-4 py-2 text-right font-semibold text-navy">Participação</th>
              </tr>
            </thead>
            <tbody>
              {sales.byMarketplace.map((m) => (
                <tr key={m.marketplace} className="border-t border-navy/[.06]">
                  <td className="px-4 py-2 text-navy">
                    {MARKETPLACE_LABEL[m.marketplace] ?? m.marketplace}
                  </td>
                  <td className="px-4 py-2 text-right text-navy">{formatCurrency(m.revenue)}</td>
                  <td className="px-4 py-2 text-right text-[#5B647E]">{m.orders}</td>
                  <td className="px-4 py-2 text-right text-[#5B647E]">
                    {pct(sales.revenue > 0 ? (m.revenue / sales.revenue) * 100 : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {daily.days.some((d) => d.revenue > 0) && (
        <Section title="Dia a dia">
          <p className="mb-3 text-sm text-[#5B647E]">
            Média de {formatCurrency(daily.average)} nos dias com venda.
            {daily.zeroDays.length > 0 &&
              ` ${daily.zeroDays.length} ${daily.zeroDays.length === 1 ? "dia ficou" : "dias ficaram"} sem nenhuma venda.`}
          </p>

          <div className="mb-6 flex h-24 items-end gap-[3px]">
            {daily.days.map((d) => {
              const max = Math.max(...daily.days.map((x) => x.revenue), 1);
              const height = (d.revenue / max) * 100;
              const isBest = daily.best.some((b) => b.date === d.date);
              const isWorst = daily.worst.some((w) => w.date === d.date);
              return (
                <div
                  key={d.date}
                  title={`${fmtDay(d.date)} — ${formatCurrency(d.revenue)}`}
                  className="flex-1"
                  style={{ height: "100%", display: "flex", alignItems: "flex-end" }}
                >
                  <div
                    className={`w-full rounded-t ${
                      isBest ? "bg-green-600" : isWorst ? "bg-orange-400" : "bg-blue/30"
                    }`}
                    style={{ height: `${Math.max(height, d.revenue > 0 ? 3 : 1)}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-green-700">
                Melhores dias
              </p>
              <div className="flex flex-col gap-3">
                {daily.best.map((d) => (
                  <DayCard key={d.date} day={d} tone="alta" />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#c2410c]">
                Dias mais fracos
              </p>
              <div className="flex flex-col gap-3">
                {daily.worst.map((d) => (
                  <DayCard key={d.date} day={d} tone="baixa" />
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-[#94A0BD]">
            As ações listadas em cada dia vêm do Controle — registradas no próprio dia ou nos dois
            anteriores. Elas mostram o que foi feito por perto, não provam causa.
          </p>
        </Section>
      )}

      {products.length > 0 && (
        <Section title="Produtos">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-gray">
              <tr>
                <th className="px-4 py-2 font-semibold text-navy">Produto</th>
                <th className="px-4 py-2 font-semibold text-navy">SKU</th>
                <th className="px-4 py-2 text-right font-semibold text-navy">Unidades</th>
                <th className="px-4 py-2 text-right font-semibold text-navy">Faturamento</th>
                <th className="px-4 py-2 text-right font-semibold text-navy">Participação</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 10).map((p) => (
                <tr key={p.sku} className="border-t border-navy/[.06]">
                  <td className="max-w-[280px] truncate px-4 py-2 text-navy" title={p.name}>
                    {p.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-[#5B647E]">{p.sku}</td>
                  <td className="px-4 py-2 text-right text-[#5B647E]">{int(p.units)}</td>
                  <td className="px-4 py-2 text-right text-navy">{formatCurrency(p.revenue)}</td>
                  <td className="px-4 py-2 text-right text-[#5B647E]">{pct(p.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {ads && (
        <Section title="Ads">
          <div className="grid grid-cols-4 gap-4">
            <Metric
              label="Investimento"
              value={formatCurrency(ads.expense)}
              previous={delta(ads.expense, ads.prevExpense)?.change}
            />
            <Metric label="GMV gerado" value={formatCurrency(ads.gmv)} />
            <Metric
              label="ROAS"
              value={ads.roas.toFixed(2).replace(".", ",")}
              previous={delta(ads.roas, ads.prevRoas)?.change}
            />
            <Metric label="ACOS" value={pct(ads.acos)} />
          </div>
          <p className="mt-4 text-sm text-[#5B647E]">
            {ads.conversions} conversões a {formatCurrency(ads.costPerConversion)} cada. O
            investimento em anúncios representou {pct(ads.shareOfRevenue)} do faturamento do mês.
          </p>
          {ads.best && ads.worst && ads.best.name !== ads.worst.name && (
            <p className="mt-2 text-sm text-[#5B647E]">
              Melhor retorno: <strong className="text-navy">{ads.best.name}</strong> (ROAS{" "}
              {ads.best.roas.toFixed(2).replace(".", ",")}). Pior:{" "}
              <strong className="text-navy">{ads.worst.name}</strong> (ROAS{" "}
              {ads.worst.roas.toFixed(2).replace(".", ",")}).
            </p>
          )}
        </Section>
      )}

      {traffic && (
        <Section title="Tráfego">
          <div className="grid grid-cols-4 gap-4">
            <Metric label="Impressões" value={int(traffic.impressions)} />
            <Metric
              label="Visitantes"
              value={int(traffic.visitors)}
              previous={delta(traffic.visitors, traffic.prevVisitors)?.change}
            />
            <Metric
              label="Conversão"
              value={pct(traffic.conversion)}
              previous={delta(traffic.conversion, traffic.prevConversion)?.change}
            />
            <Metric label="Taxa de rejeição" value={pct(traffic.bounceRate)} />
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
              Do anúncio à compra
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {[
                { label: "Impressões", value: traffic.impressions },
                { label: "Cliques", value: traffic.clicks },
                { label: "Visitantes", value: traffic.visitors },
                { label: "No carrinho", value: traffic.cartUnits },
                { label: "Compradores", value: traffic.buyers },
              ].map((step, i, all) => (
                <div key={step.label} className="flex items-center gap-2">
                  <div className="rounded-lg bg-brand-gray/60 px-3 py-2 text-center">
                    <p className="font-display font-bold text-navy">{int(step.value)}</p>
                    <p className="text-[10px] text-[#94A0BD]">{step.label}</p>
                  </div>
                  {i < all.length - 1 && (
                    <span className="text-xs text-[#94A0BD]">
                      {step.value > 0
                        ? `${((all[i + 1].value / step.value) * 100).toFixed(1).replace(".", ",")}%`
                        : "—"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {changes.total > 0 && (
        <Section title="Ações do mês">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
                Por categoria
              </p>
              <ul className="flex flex-col gap-1 text-sm text-[#5B647E]">
                {changes.byCategory.map((c) => (
                  <li key={c.category}>
                    {CHANGE_CATEGORY_LABEL[c.category] ?? c.category}:{" "}
                    <strong className="text-navy">{c.count}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
                Por status
              </p>
              <ul className="flex flex-col gap-1 text-sm text-[#5B647E]">
                {changes.byStatus.map((s) => (
                  <li key={s.status}>
                    {CHANGE_STATUS_LABEL[s.status] ?? s.status}:{" "}
                    <strong className="text-navy">{s.count}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {changes.pending.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
                Em aberto
              </p>
              <ul className="flex flex-col gap-1 text-sm text-[#5B647E]">
                {changes.pending.map((p, i) => (
                  <li key={i}>
                    {p.description}
                    {p.owner ? ` — ${p.owner}` : ""}{" "}
                    <span className="text-[#94A0BD]">
                      ({CHANGE_STATUS_LABEL[p.status] ?? p.status})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
