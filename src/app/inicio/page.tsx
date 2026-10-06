import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LandingLeadForm } from "@/components/landing-lead-form";
import "./landing.css";

export const metadata: Metadata = {
  title: "TAKT Assessoria — assessoria para marketplaces",
  description:
    "Um time especialista operando seu Mercado Livre, Amazon, Shopee, TikTok Shop e Shein. Mais de R$ 20 milhões faturados pelos nossos clientes.",
};

const GOLD = "#F5B82E";

function Trophy({ size, stroke = "#0A1024" }: { size: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
  );
}

function Check({ size = 22, width = 2.6 }: { size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 2 }}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7E8AB0" strokeWidth={2.4} strokeLinecap="round" style={{ flex: "none", marginTop: 2 }}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

const NAV = [
  { href: "#conquistas", label: "O que você conquista" },
  { href: "#diferenciais", label: "Por que a TAKT" },
  { href: "#app", label: "App" },
  { href: "#faq", label: "Dúvidas" },
];

const TICKER = [
  "+R$ 20 mi faturados",
  "Mercado Livre",
  "Amazon",
  "Shopee",
  "TikTok Shop",
  "Shein",
  "4 anos de experiência",
];

const PROBLEMS = [
  {
    title: "Anúncios que não aparecem",
    text: "Títulos, fotos e fichas fracas deixam seu produto atrás do concorrente na busca.",
  },
  {
    title: "Ads que consomem a margem",
    text: "Campanha rodando sem meta de retorno vira custo, não crescimento.",
  },
  {
    title: "Cada canal, uma regra diferente",
    text: "Taxas, frete, logística e políticas mudam o tempo todo — e cada marketplace joga de um jeito.",
  },
  {
    title: "O dono virou o operador da loja",
    text: "Achar alguém bom para os marketplaces é difícil, treinar leva meses — e quando a pessoa sai, tudo volta para você.",
  },
];

const COMPARISON: [string, string, string, string][] = [
  ["Seu tempo", "Todo ele vai para a operação", "Gasto contratando, treinando e conferindo", "Livre para cuidar do negócio"],
  ["Experiência", "Aprendendo na tentativa e erro", "Depende de quem você encontrar", "4 anos e muitas operações nos 5 canais"],
  ["Treinamento", "Cursos e vídeos no fim de semana", "Meses até a pessoa andar sozinha", "Nenhum: o time já chega pronto"],
  ["Custo", "O custo das oportunidades perdidas", "Salário, encargos, benefícios e ferramentas", "Uma mensalidade, sem encargos trabalhistas"],
  ["Continuidade", "Para quando você para", "Se a pessoa sai, recomeça do zero", "Um time inteiro, sem depender de uma pessoa"],
  ["Acompanhamento", "Planilhas e contas no fim do mês", "Relatório quando dá tempo", "App com suas vendas e o seu lucro"],
];

const WINS = [
  {
    title: "Mais vendas",
    text: "Anúncios otimizados para a busca e campanhas de Ads com meta de retorno clara.",
    tag: "Gestão de anúncios + Ads",
    icon: (
      <>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M15 7h6v6" />
      </>
    ),
  },
  {
    title: "Mais lucro por venda",
    text: "Preço calculado com taxas, frete, impostos e custos de cada canal — crescer sem queimar margem.",
    tag: "Precificação e margem",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.2 1.7 3 2 3 .9 3 2.1-1.3 1.9-3 1.9c-1.4 0-2.6-.6-3-1.6M12 6.5V8M12 16v1.5" />
      </>
    ),
  },
  {
    title: "Reputação no topo",
    text: "Métricas, atendimento, prazos e logística sob controle para a conta ficar saudável e bem ranqueada.",
    tag: "Reputação e operação",
    icon: (
      <>
        <circle cx="12" cy="9" r="6" />
        <path d="M8.5 13.8L7 22l5-3 5 3-1.5-8.2" />
      </>
    ),
  },
  {
    title: "Novos canais",
    text: "Expansão para TikTok Shop, Shein ou Amazon com a operação estruturada desde o primeiro dia.",
    tag: "Expansão multicanal",
    icon: (
      <>
        <path d="M12 3v18M3 12h18" />
        <circle cx="12" cy="12" r="9" />
      </>
    ),
  },
];

const OTHERS = [
  "Centenas de clientes por gestor e atendimento por ticket",
  "Meta de faturamento, mesmo que a margem vá embora",
  "Mesma receita aplicada para todo tipo de loja",
  "Foco nos canais tradicionais, sem Shein e TikTok Shop",
  "Resultado só no relatório do fim do mês",
];

const TAKT = [
  "Atendimento próximo, com acesso direto ao seu especialista",
  "Lucro antes de volume: cada decisão passa pela margem",
  "Plano feito para o momento e o caixa da sua loja",
  "Especialistas nos 5 canais — incluindo Shein e TikTok Shop",
  "Calculadora própria para precificar com lucro real",
  "App com login para você acompanhar vendas e lucro",
];

const APP_BARS: [string, number, string][] = [
  ["Mercado Livre", 92, "R$ 12.880"],
  ["Shopee", 64, "R$ 7.410"],
  ["Amazon", 48, "R$ 5.960"],
  ["TikTok Shop", 34, "R$ 3.520"],
  ["Shein", 20, "R$ 1.770"],
];

const STEPS = [
  { n: "01", title: "Diagnóstico", text: "Analisamos contas, anúncios, preços e campanhas para achar onde está o dinheiro parado." },
  { n: "02", title: "Plano de ação", text: "Definimos metas, prioridades e canais de acordo com o momento e o caixa do seu negócio." },
  { n: "03", title: "Execução", text: "Nosso time coloca o plano em prática: anúncios, Ads, preço e operação no dia a dia." },
  { n: "04", title: "Resultado", text: "Acompanhamento com os números da operação, metas batidas e os próximos passos." },
];

const AUDIENCE = [
  {
    badge: "Começar",
    gold: false,
    title: "Fazer a primeira venda do jeito certo",
    text: "Você tem produto, mas não sabe por qual marketplace começar nem como montar a operação.",
  },
  {
    badge: "Destravar",
    gold: false,
    title: "Voltar a crescer com margem",
    text: "O faturamento parou, a margem apertou e falta tempo para cuidar de tudo.",
  },
  {
    badge: "Escalar",
    gold: true,
    title: "Dominar novos canais",
    text: "Você vende bem em um marketplace e quer levar a operação para TikTok Shop, Shein ou Amazon.",
  },
];

const FAQ: [string, string][] = [
  [
    "Em quais marketplaces vocês atuam?",
    "Mercado Livre, Amazon, Shopee, TikTok Shop e Shein. Podemos cuidar de um canal ou de todos ao mesmo tempo.",
  ],
  [
    "Preciso já vender em algum marketplace?",
    "Não. Atendemos quem está começando e quem já tem operação rodando — o diagnóstico define o melhor ponto de partida.",
  ],
  [
    "Como funciona a cobrança?",
    "[EXPLICAR MODELO DE COBRANÇA — ex.: mensalidade fixa, fixo + variável sobre faturamento, por canal]",
  ],
  [
    "Em quanto tempo vejo resultado?",
    "[PRAZO MÉDIO PARA PRIMEIROS RESULTADOS] — depende do ponto de partida, do canal e do investimento disponível.",
  ],
  ["Tem fidelidade? Posso cancelar quando quiser?", "[REGRA DE CONTRATO — ex.: sem fidelidade, aviso prévio de 30 dias]"],
  [
    "Vocês cuidam de vários marketplaces ao mesmo tempo?",
    "Sim. Montamos a estratégia olhando a operação inteira, para que um canal não canibalize o outro em preço, estoque ou investimento em Ads.",
  ],
  [
    "Quem vai cuidar da minha conta?",
    "Um especialista da TAKT acompanha sua operação de perto, com contato direto — sem central de atendimento. [AJUSTAR CONFORME O MODELO DE ATENDIMENTO]",
  ],
  [
    "Preciso aumentar meu investimento em Ads?",
    "Não necessariamente. Primeiro arrumamos anúncios, preço e campanhas atuais; só sugerimos aumentar o investimento quando a conta fecha com lucro.",
  ],
  [
    "Como funciona o app da Área do cliente?",
    "Todo cliente TAKT recebe um login para acompanhar as vendas e o lucro da operação, sem depender de planilhas ou de esperar o relatório do mês.",
  ],
];

const SECTION = "relative px-6";
const WRAP = "relative mx-auto w-full max-w-[1200px]";

/**
 * The public front page, shown at "/" to anyone without a login (the
 * middleware rewrites to it); a signed-in visitor at "/" gets the dashboard.
 */
export default function InicioPage() {
  return (
    <div className="lp">
      {/* ============ HERO ============ */}
      <section
        id="topo"
        className={`${SECTION} pb-16 pt-0 sm:pb-[120px]`}
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 85% 20%, rgba(47,85,228,0.40), transparent 70%), radial-gradient(ellipse 45% 40% at 10% 0%, rgba(110,139,255,0.22), transparent 70%), radial-gradient(ellipse 40% 35% at 80% 85%, rgba(245,184,46,0.16), transparent 70%), linear-gradient(180deg, #0A1230 0%, #060A18 100%)",
        }}
      >
        <div className="lp-dots pointer-events-none absolute inset-0" />

        <header className={`${WRAP} flex items-center justify-between gap-4 py-5 sm:py-[22px]`}>
          <a href="#topo" className="flex items-center gap-4 no-underline">
            <Image
              src="/takt-logo-branco.png"
              alt="TAKT Assessoria"
              width={133}
              height={42}
              priority
              className="block h-9 w-auto sm:h-[42px]"
            />
          </a>
          <nav className="flex items-center gap-x-7 gap-y-3 text-[15px] font-medium">
            {/* The section links only jump down a page the reader is already
                scrolling. On a phone they wrapped to two more lines and pushed
                the headline off the first screen, so they stand down and the
                one link that leaves the page stays. */}
            <span className="hidden items-center gap-x-7 lg:flex">
              {NAV.map((item) => (
                <a key={item.href} href={item.href} className="!text-[#C9D2F2] no-underline hover:!text-white">
                  {item.label}
                </a>
              ))}
            </span>
            <Link
              href="/login"
              className="lp-btn lp-btn-ghost whitespace-nowrap px-4 py-2.5 text-sm font-bold sm:px-5 sm:py-[11px] sm:text-[15px]"
            >
              Área do cliente
            </Link>
          </nav>
        </header>

        <div className={`${WRAP} flex flex-wrap items-center gap-10 pt-10 sm:gap-16 sm:pt-16`}>
          <div className="flex min-w-0 flex-1 basis-[560px] flex-col gap-7">
            <span className="lp-eyebrow">Assessoria para marketplaces</span>
            <h1 className="lp-h1 m-0 font-extrabold">
              Seu troféu é <span className="lp-tg">vender mais.</span>
              <br />
              <span className="font-light text-[#DDE3F7]">O nosso é te levar até lá.</span>
            </h1>
            <p className="m-0 max-w-[540px] text-[19px] text-[#A3AECF]">
              Um time especialista operando seu{" "}
              <b className="font-bold text-white">Mercado Livre, Amazon, Shopee, TikTok Shop e Shein</b> —
              enquanto você ganha tempo para cuidar do resto do negócio. Sem contratar, sem treinar, sem
              recomeçar do zero.
            </p>
            <div className="flex flex-wrap gap-3.5 pt-1">
              <a href="#contato" className="lp-btn lp-btn-gold px-8 py-[18px] text-base font-extrabold">
                Quero vender mais
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M9 7h8v8" />
                </svg>
              </a>
              <Link href="/calculadora" className="lp-btn lp-btn-ghost px-[30px] py-[18px] text-base font-bold">
                Usar a calculadora
              </Link>
            </div>
          </div>

          {/* trophy card */}
          <div className="relative min-w-0 flex-1 basis-[400px]">
            <div
              className="pointer-events-none absolute inset-x-[10%] bottom-[20%] top-[8%] blur-[40px]"
              style={{ background: "radial-gradient(circle, rgba(245,184,46,0.45), transparent 65%)" }}
            />
            <div className="lp-glass relative flex flex-col items-center gap-2.5 rounded-[32px] px-9 pb-9 pt-11 text-center backdrop-blur-[14px]">
              <div
                className="mb-2.5 flex h-[92px] w-[92px] items-center justify-center rounded-full"
                style={{
                  background: "radial-gradient(circle at 35% 30%, #FFE7A3, #F5B82E 55%, #B57800)",
                  boxShadow: "0 0 0 10px rgba(245,184,46,0.10), 0 16px 40px rgba(245,184,46,0.45)",
                }}
              >
                <Trophy size={46} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[#A3AECF]">
                Já conquistamos
              </span>
              <span className="lp-tg lp-num-hero font-extrabold">R$ 20 mi+</span>
              <span className="text-[17px] font-medium text-[#C9D2F2]">
                faturados pelos nossos clientes
              </span>
              <div
                className="my-[18px] mb-2 h-px w-full"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)" }}
              />
              <div className="grid w-full grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <span className="text-3xl font-extrabold leading-tight">4 anos</span>
                  <span className="text-[13px] text-[#A3AECF]">de experiência</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-extrabold leading-tight">5 canais</span>
                  <span className="text-[13px] text-[#A3AECF]">operados pelo time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TICKER ============ */}
      <div
        className="relative z-[2] -mx-10 -mt-10 overflow-hidden py-[18px]"
        style={{
          transform: "rotate(-2deg)",
          background: "linear-gradient(90deg, #1F3FB8 0%, #2F55E4 40%, #6E8BFF 60%, #2F55E4 100%)",
          boxShadow: "0 20px 50px rgba(47,85,228,0.35)",
        }}
      >
        <div className="lp-ticker whitespace-nowrap text-xl font-extrabold uppercase tracking-[0.06em] text-white">
          {[0, 1].map((pass) =>
            TICKER.map((item) => (
              <span key={`${pass}-${item}`} className="flex items-center gap-12">
                {item}
                <span style={{ color: GOLD }}>✦</span>
              </span>
            )),
          )}
        </div>
      </div>

      {/* ============ PROBLEMA ============ */}
      <section
        className={`${SECTION} pb-16 pt-20 sm:pb-[110px] sm:pt-[140px]`}
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 0% 50%, rgba(180,35,24,0.14), transparent 70%), #060A18",
        }}
      >
        <div className={`${WRAP} flex flex-wrap items-start gap-14`}>
          <div className="flex min-w-0 flex-1 basis-[380px] flex-col gap-5">
            <span className="lp-eyebrow">O problema</span>
            <h2 className="lp-h2-sm m-0 font-light">
              Estar no marketplace <b className="font-extrabold">não é o mesmo que</b>{" "}
              <span className="lp-tb font-extrabold">ganhar nele</span>
            </h2>
            <p className="m-0 text-lg text-[#A3AECF]">
              Muita loja cresce em pedidos e perde dinheiro no caminho. Sem alguém olhando a operação
              todos os dias, o faturamento sobe e o lucro some.
            </p>
          </div>
          <div className="flex min-w-0 flex-1 basis-[520px] flex-col gap-3.5">
            {PROBLEMS.map((p, i) => (
              <div key={p.title} className="lp-glass flex items-start gap-5 rounded-[20px] px-7 py-6">
                <div className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[14px] border border-[#F04438]/35 bg-[#F04438]/[.14] font-extrabold text-[#FF8A80]">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="m-0 text-[19px] font-bold">{p.title}</h3>
                  <p className="m-0 text-[#A3AECF]">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TEMPO / MÃO DE OBRA ============ */}
      <section
        id="tempo"
        className={`${SECTION} py-16 sm:py-[110px]`}
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 100% 0%, rgba(47,85,228,0.28), transparent 70%), linear-gradient(180deg, #060A18, #0A1230 60%, #060A18)",
        }}
      >
        <div className={`${WRAP} flex flex-col gap-10 sm:gap-[52px]`}>
          <div className="flex flex-wrap items-end gap-x-16 gap-y-8">
            <div className="flex min-w-0 flex-1 basis-[560px] flex-col gap-5">
              <span className="lp-eyebrow">Seu tempo de volta</span>
              <h2 className="lp-h2 m-0 font-light">
                Delegue o marketplace para quem já sabe fazer —{" "}
                <span className="lp-tg font-extrabold">sem precisar ensinar</span>
              </h2>
            </div>
            <p className="m-0 min-w-0 flex-1 basis-[400px] text-lg text-[#A3AECF]">
              A TAKT funciona como o seu time de marketplace terceirizado: gente especializada, com
              experiência de muitas operações, pelo custo de um serviço — não de uma equipe. Você para de
              operar e volta a fazer o negócio crescer.
            </p>
          </div>

          {/* Four columns need 780 px. On a phone that is a sideways scroll
              inside a downward one, with nothing saying so — the comparison
              is the argument of this section, so below md it becomes one card
              per row instead of a table with three columns off screen. */}
          <div className="flex flex-col gap-3 lg:hidden">
            {COMPARISON.map(([label, alone, hire, takt]) => (
              <div key={label} className="lp-glass flex flex-col gap-3 rounded-3xl p-5">
                <h3 className="m-0 text-[17px] font-extrabold">{label}</h3>
                <div className="flex flex-col gap-2.5 text-[15px]">
                  {[
                    ["Fazer sozinho", alone],
                    ["Contratar um funcionário", hire],
                  ].map(([who, what]) => (
                    <div key={who} className="flex flex-col">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7E8AB0]">
                        {who}
                      </span>
                      <span className="text-[#A3AECF]">{what}</span>
                    </div>
                  ))}
                  <div
                    className="flex flex-col rounded-2xl border border-[#F5B82E]/35 px-4 py-3"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(47,85,228,0.3), rgba(47,85,228,0.08))",
                    }}
                  >
                    <span className="lp-tg text-[11px] font-extrabold uppercase tracking-[0.14em]">
                      Ter a TAKT
                    </span>
                    <span className="font-bold">{takt}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lp-glass hidden overflow-x-auto rounded-3xl lg:block">
            <table className="w-full min-w-[780px] border-collapse text-base">
              <thead>
                <tr>
                  <th scope="col" className="w-1/5 p-6 text-left" />
                  <th scope="col" className="p-6 text-left text-[17px] font-semibold text-[#A3AECF]">
                    Fazer sozinho
                  </th>
                  <th scope="col" className="p-6 text-left text-[17px] font-semibold text-[#A3AECF]">
                    Contratar um funcionário
                  </th>
                  <th
                    scope="col"
                    className="p-6 text-left text-[18px] font-extrabold"
                    style={{
                      background: "linear-gradient(180deg, rgba(47,85,228,0.45), rgba(47,85,228,0.18))",
                      borderTop: `3px solid ${GOLD}`,
                    }}
                  >
                    <span className="lp-tg">Ter a TAKT</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(([label, alone, hire, takt]) => (
                  <tr key={label}>
                    <th scope="row" className="border-t border-white/[.08] px-6 py-5 text-left font-bold">
                      {label}
                    </th>
                    <td className="border-t border-white/[.08] px-6 py-5 text-[#A3AECF]">{alone}</td>
                    <td className="border-t border-white/[.08] px-6 py-5 text-[#A3AECF]">{hire}</td>
                    <td className="border-t border-white/[.08] bg-[#2F55E4]/[.16] px-6 py-5 font-bold">
                      {takt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="flex flex-wrap items-center justify-between gap-x-7 gap-y-4 rounded-3xl border border-[#F5B82E]/35 px-8 py-7"
            style={{ background: "linear-gradient(110deg, rgba(245,184,46,0.20), rgba(245,184,46,0.04) 60%)" }}
          >
            <p className="m-0 min-w-0 flex-1 basis-[420px] text-xl font-light">
              Muitas vezes, a gente chega com{" "}
              <b className="font-extrabold">mais experiência em marketplace do que o próprio dono</b> — e é
              isso que você está contratando.
            </p>
            <a href="#contato" className="lp-btn lp-btn-gold px-[30px] py-[17px] text-base font-extrabold">
              Quero delegar meu marketplace
            </a>
          </div>
        </div>
      </section>

      {/* ============ CONQUISTAS ============ */}
      <section
        id="conquistas"
        className={`${SECTION} py-16 sm:py-[110px]`}
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 100%, rgba(245,184,46,0.12), transparent 70%), #060A18",
        }}
      >
        <div className={`${WRAP} flex flex-col gap-10 sm:gap-[52px]`}>
          <div className="flex max-w-[800px] flex-col gap-5">
            <span className="lp-eyebrow">O que você conquista</span>
            <h2 className="lp-h2 m-0 font-light">
              Você define a meta.{" "}
              <span className="lp-tb font-extrabold">A gente coloca a mão na operação</span> para chegar
              nela.
            </h2>
          </div>
          <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {WINS.map((w) => (
              <div key={w.title} className="lp-glass flex flex-col gap-4 rounded-3xl p-8">
                <div
                  className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl"
                  style={{
                    background: "linear-gradient(135deg, #FFE08A, #F5B82E 50%, #E39A00)",
                    boxShadow: "0 10px 26px rgba(245,184,46,0.3)",
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0A1024" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    {w.icon}
                  </svg>
                </div>
                <h3 className="m-0 text-[25px] font-extrabold leading-[1.15]">{w.title}</h3>
                <p className="m-0 text-[#A3AECF]">{w.text}</p>
                <span
                  className="mt-auto border-t border-white/10 pt-3.5 text-[13px] font-semibold tracking-[0.04em]"
                  style={{ color: GOLD }}
                >
                  {w.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ RESULTADOS / PÓDIO ============ */}
      <section
        id="resultados"
        className={`${SECTION} pb-0 pt-16 sm:pt-[110px]`}
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 100%, rgba(245,184,46,0.30), transparent 70%), radial-gradient(ellipse 80% 60% at 50% 0%, rgba(47,85,228,0.30), transparent 70%), linear-gradient(180deg, #0A1230, #0B1638)",
        }}
      >
        <div className="lp-dots pointer-events-none absolute inset-0" />
        <div className="relative mx-auto flex w-full max-w-[1100px] flex-col gap-10 sm:gap-16">
          <div className="mx-auto flex max-w-[760px] flex-col items-center gap-5 text-center">
            <span className="lp-eyebrow lp-eyebrow-center">Resultados</span>
            <h2 className="lp-h2 m-0 font-light">
              Nosso pódio é construído com{" "}
              <span className="lp-tg font-extrabold">o resultado dos clientes</span>
            </h2>
          </div>
          {/* Stacked, a podium is just three cards — so the winner goes first
              and the steps that made it one lose their height. */}
          <div className="flex flex-wrap items-end justify-center gap-3.5">
            <div className="lp-glass order-2 flex min-w-0 flex-1 basis-[260px] flex-col items-center gap-1.5 rounded-3xl px-7 pb-8 pt-9 text-center sm:order-none sm:rounded-b-none sm:border-b-0 sm:pb-[60px]">
              <span className="text-[13px] font-bold tracking-[0.2em] text-[#A3AECF]">2º</span>
              <span className="lp-tb lp-num-side font-extrabold">4 anos</span>
              <span className="text-base text-[#C9D2F2]">vivendo o dia a dia dos marketplaces</span>
            </div>
            <div
              className="order-1 flex min-w-0 flex-1 basis-[300px] flex-col items-center gap-2 rounded-3xl px-7 pb-10 pt-11 text-center text-[#0A1024] sm:order-none sm:rounded-b-none sm:pb-[104px]"
              style={{
                background: "linear-gradient(180deg, #FFE08A 0%, #F5B82E 35%, #C98700 100%)",
                boxShadow: "0 -10px 60px rgba(245,184,46,0.45), inset 0 1px 0 rgba(255,255,255,0.7)",
              }}
            >
              <Trophy size={58} />
              <span className="text-[13px] font-extrabold tracking-[0.2em]">1º</span>
              <span className="lp-num-podium font-extrabold">R$ 20 mi+</span>
              <span className="text-[17px] font-bold">faturados pelos nossos clientes</span>
            </div>
            <div className="lp-glass order-3 flex min-w-0 flex-1 basis-[260px] flex-col items-center gap-1.5 rounded-3xl px-7 py-8 text-center sm:order-none sm:rounded-b-none sm:border-b-0">
              <span className="text-[13px] font-bold tracking-[0.2em] text-[#A3AECF]">3º</span>
              <span className="lp-tb lp-num-side font-extrabold">5 canais</span>
              <span className="text-base text-[#C9D2F2]">
                Mercado Livre, Amazon, Shopee, TikTok Shop e Shein
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ DIFERENCIAIS ============ */}
      <section
        id="diferenciais"
        className={`${SECTION} pb-16 pt-16 sm:pb-[110px] sm:pt-[120px]`}
        style={{
          background:
            "radial-gradient(ellipse 45% 50% at 100% 60%, rgba(47,85,228,0.28), transparent 70%), #060A18",
        }}
      >
        <div className={`${WRAP} flex flex-col gap-10 sm:gap-[52px]`}>
          <div className="flex max-w-[820px] flex-col gap-5">
            <span className="lp-eyebrow">Por que a TAKT</span>
            <h2 className="lp-h2 m-0 font-light">
              Na assessoria grande, sua loja é mais uma.{" "}
              <span className="lp-tg font-extrabold">Aqui, ela é prioridade.</span>
            </h2>
            <p className="m-0 text-lg text-[#A3AECF]">
              Não queremos ser a maior. Queremos ser a que mais entende da sua operação.
            </p>
          </div>
          <div className="flex flex-wrap items-stretch gap-[18px]">
            <div className="flex min-w-0 flex-1 basis-[360px] flex-col gap-4 rounded-3xl border border-white/[.07] bg-white/[.02] p-[34px]">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7E8AB0]">
                Em muitas assessorias
              </span>
              {OTHERS.map((line) => (
                <div key={line} className="flex items-start gap-3 text-[#A3AECF]">
                  <Cross />
                  <span>{line}</span>
                </div>
              ))}
            </div>
            <div
              className="flex min-w-0 flex-1 basis-[360px] flex-col gap-4 rounded-3xl border border-[#6E8BFF]/45 p-[34px]"
              style={{
                background: "linear-gradient(160deg, rgba(47,85,228,0.38), rgba(47,85,228,0.08) 70%)",
                boxShadow: "0 20px 60px rgba(47,85,228,0.25)",
              }}
            >
              <span className="lp-tg text-xs font-extrabold uppercase tracking-[0.28em]">Na TAKT</span>
              {TAKT.map((line) => (
                <div key={line} className="flex items-start gap-3 font-semibold">
                  <Check />
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ APP ============ */}
      <section
        id="app"
        className={`${SECTION} py-16 sm:py-[110px]`}
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 80% 50%, rgba(47,85,228,0.38), transparent 70%), linear-gradient(180deg, #060A18, #0A1230 50%, #060A18)",
        }}
      >
        <div className={`${WRAP} flex flex-wrap items-center gap-10 sm:gap-16`}>
          <div className="flex min-w-0 flex-1 basis-[400px] flex-col gap-[22px]">
            <span className="lp-eyebrow">Exclusivo para clientes</span>
            <h2 className="lp-h2 m-0 font-light">
              Veja quanto vendeu — e <span className="lp-tg font-extrabold">quanto lucrou</span>
            </h2>
            <p className="m-0 text-lg text-[#A3AECF]">
              Além do serviço, você recebe acesso ao app da TAKT. Com seu login na Área do cliente,
              acompanha as vendas e o resultado da operação a qualquer momento — algo que a maioria das
              assessorias não entrega.
            </p>
            <div className="flex flex-col gap-3 text-[17px] font-medium">
              {[
                "Vendas de todos os marketplaces em um só lugar",
                "O lucro de verdade, depois de taxas e custos",
                "Transparência total sobre o trabalho da assessoria",
              ].map((line) => (
                <div key={line} className="flex items-start gap-3">
                  <Check size={24} width={2.4} />
                  <span>{line}</span>
                </div>
              ))}
            </div>
            <Link
              href="/login"
              className="lp-btn lp-btn-blue self-start px-[30px] py-[17px] text-base font-extrabold"
            >
              Acessar a Área do cliente
            </Link>
          </div>

          <div className="relative flex min-w-0 flex-1 basis-[560px] flex-col gap-3">
            <div
              className="pointer-events-none absolute inset-[10%] blur-[50px]"
              style={{ background: "radial-gradient(circle, rgba(47,85,228,0.6), transparent 65%)" }}
            />
            <div className="lp-glass relative rounded-[26px] p-3 shadow-[0_40px_90px_rgba(0,0,0,0.5)]">
              <div className="flex flex-col overflow-hidden rounded-[18px] border border-white/[.06] bg-[#0B1229]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] px-5 py-3.5">
                  <Image src="/takt-logo-branco.png" alt="TAKT" width={82} height={26} className="h-[26px] w-auto" />
                  <div className="flex items-center gap-2 text-[13px] font-bold">
                    <span className="rounded-lg bg-white/[.06] px-3 py-1.5 text-[#C9D2F2]">Este mês</span>
                    <span
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-white"
                      style={{ background: "linear-gradient(135deg, #6E8BFF, #2F55E4)" }}
                    >
                      LJ
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-3.5 p-5">
                  <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))]">
                    {[
                      ["Vendas", "R$ 184.320", false],
                      ["Lucro", "R$ 31.540", true],
                      ["Margem", "17,1%", false],
                      ["Pedidos", "1.284", false],
                    ].map(([label, value, gold]) => (
                      <div
                        key={label as string}
                        className="flex flex-col gap-0.5 rounded-[14px] px-4 py-3.5"
                        style={
                          gold
                            ? {
                                background:
                                  "linear-gradient(160deg, rgba(245,184,46,0.22), rgba(245,184,46,0.05))",
                                border: "1px solid rgba(245,184,46,0.4)",
                              }
                            : {
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.06)",
                              }
                        }
                      >
                        <span
                          className="text-[11px] font-bold uppercase tracking-[0.08em]"
                          style={{ color: gold ? GOLD : "#7E8AB0" }}
                        >
                          {label as string}
                        </span>
                        <span className="text-[21px] font-extrabold">{value as string}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 rounded-[14px] border border-white/[.06] bg-white/[.03] px-[18px] py-4">
                    <span className="text-sm font-bold">Vendas e lucro por marketplace</span>
                    {/* Three columns need about 210 px of fixed width, which
                        left the bar nine pixels wide on a phone. Below that
                        the name and the figure share a line and the bar gets
                        the full width underneath. */}
                    <div className="flex flex-col gap-2.5 text-[13px] font-semibold text-[#C9D2F2] sm:grid sm:items-center sm:gap-x-3 sm:[grid-template-columns:104px_minmax(0,1fr)_84px]">
                      {APP_BARS.map(([name, pct, value]) => (
                        <div key={name} className="flex flex-col gap-1.5 sm:contents">
                          <div className="flex items-baseline justify-between gap-3 sm:block">
                            <span>{name}</span>
                            <span className="sm:hidden" style={{ color: GOLD }}>
                              {value}
                            </span>
                          </div>
                          <div className="h-2.5 rounded-md bg-white/[.08]">
                            <div
                              className="h-full rounded-md"
                              style={{
                                width: `${pct}%`,
                                background: "linear-gradient(90deg, #2F55E4, #8FA8FF)",
                              }}
                            />
                          </div>
                          <span className="hidden text-right sm:block" style={{ color: GOLD }}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-[#7E8AB0]">
                      Barras: vendas no mês · Valor: lucro
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <span className="relative text-center text-[13px] text-[#7E8AB0]">
              Imagem ilustrativa — dados fictícios. [TROCAR POR PRINT REAL DO APP]
            </span>
          </div>
        </div>
      </section>

      {/* ============ COMO FUNCIONA ============ */}
      <section id="como-funciona" className={`${SECTION} bg-[#060A18] py-16 sm:py-[110px]`}>
        <div className={`${WRAP} flex flex-col gap-10 sm:gap-[52px]`}>
          <div className="flex max-w-[760px] flex-col gap-5">
            <span className="lp-eyebrow">Como funciona</span>
            <h2 className="lp-h2 m-0 font-light">
              Do diagnóstico ao pódio, <span className="lp-tb font-extrabold">em 4 passos</span>
            </h2>
          </div>
          <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {STEPS.map((s, i) => {
              const last = i === STEPS.length - 1;
              return (
                <div
                  key={s.n}
                  className={`flex flex-col gap-3.5 rounded-3xl p-[30px] ${last ? "border border-[#F5B82E]/45" : "lp-glass"}`}
                  style={
                    last
                      ? {
                          background:
                            "linear-gradient(160deg, rgba(245,184,46,0.24), rgba(245,184,46,0.04) 70%)",
                          boxShadow: "0 20px 50px rgba(245,184,46,0.12)",
                        }
                      : undefined
                  }
                >
                  <span className={`${last ? "lp-tg" : "lp-tb"} lp-num-step font-extrabold`}>{s.n}</span>
                  <h3 className="m-0 text-xl font-bold">{s.title}</h3>
                  <p className={`m-0 ${last ? "text-[#C9D2F2]" : "text-[#A3AECF]"}`}>{s.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ FUNDADORES ============ */}
      <section
        id="quem-somos"
        className={`${SECTION} py-16 sm:py-[110px]`}
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 15% 50%, rgba(47,85,228,0.30), transparent 70%), linear-gradient(180deg, #060A18, #0A1230 50%, #060A18)",
        }}
      >
        <div className={`${WRAP} flex flex-wrap items-center gap-10 sm:gap-16`}>
          <div className="grid min-w-0 flex-1 basis-[440px] grid-cols-2 gap-4">
            {[
              { slot: "[FOTO SÓCIO 1]", role: "[CARGO — ex.: Sócio e head de operação]", offset: false },
              { slot: "[FOTO SÓCIO 2]", role: "[CARGO — ex.: Sócio e head de Ads]", offset: true },
            ].map((p) => (
              <div key={p.slot} className={`flex flex-col gap-3.5 ${p.offset ? "sm:pt-14" : ""}`}>
                <div className="lp-glass flex aspect-[4/5] items-center justify-center rounded-3xl border-dashed font-bold text-[#7E8AB0]">
                  {p.slot}
                </div>
                <div className="flex flex-col">
                  <span className="text-[19px] font-extrabold">[NOME]</span>
                  <span className="text-[15px] text-[#A3AECF]">{p.role}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 basis-[480px] flex-col gap-[22px]">
            <span className="lp-eyebrow">Quem está por trás</span>
            <h2 className="lp-h2-sm m-0 font-light">
              Quem vende em marketplace,{" "}
              <span className="lp-tg font-extrabold">falando com quem vende</span> em marketplace
            </h2>
            <p className="m-0 text-lg text-[#A3AECF]">
              [HISTÓRIA DOS SÓCIOS — como a TAKT começou, a experiência de vocês com operação própria e o
              que os motivou a montar a assessoria.]
            </p>
            <p className="m-0 text-lg text-[#A3AECF]">
              Há 4 anos ajudamos lojistas a crescer no Mercado Livre, Amazon, Shopee, TikTok Shop e Shein
              — e já são mais de R$ 20 milhões faturados pelos nossos clientes.
            </p>
            <a href="#contato" className="lp-btn lp-btn-ghost self-start px-[30px] py-[17px] text-base font-bold">
              Falar com os sócios
            </a>
          </div>
        </div>
      </section>

      {/* ============ DEPOIMENTOS ============ */}
      <section id="depoimentos" className={`${SECTION} bg-[#060A18] py-16 sm:py-[110px]`}>
        <div className={`${WRAP} flex flex-col gap-10 sm:gap-[52px]`}>
          <div className="flex max-w-[760px] flex-col gap-5">
            <span className="lp-eyebrow">Depoimentos</span>
            <h2 className="lp-h2 m-0 font-light">
              Quem já subiu <span className="lp-tg font-extrabold">no pódio com a TAKT</span>
            </h2>
          </div>
          <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
            {[1, 2, 3].map((n) => (
              <figure key={n} className="lp-glass m-0 flex flex-col gap-5 rounded-3xl p-[34px]">
                <span className="lp-tg text-[64px] font-extrabold leading-[0.6]">“</span>
                <blockquote className="m-0 text-lg font-normal text-[#DDE3F7]">
                  [DEPOIMENTO REAL DO CLIENTE — de preferência citando um resultado concreto.]
                </blockquote>
                <figcaption className="mt-auto flex items-center gap-3">
                  <div
                    className="h-12 w-12 flex-none rounded-full border border-white/15"
                    style={{ background: "linear-gradient(135deg, #2F55E4, #0A1230)" }}
                  />
                  <div className="flex flex-col">
                    <span className="font-extrabold">[NOME]</span>
                    <span className="text-sm text-[#A3AECF]">[LOJA · MARKETPLACE]</span>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PARA QUEM ============ */}
      <section
        className={`${SECTION} py-16 sm:py-[110px]`}
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(47,85,228,0.22), transparent 70%), #060A18",
        }}
      >
        <div className={`${WRAP} flex flex-col gap-10 sm:gap-[52px]`}>
          <div className="flex max-w-[760px] flex-col gap-5">
            <span className="lp-eyebrow">Para quem é</span>
            <h2 className="lp-h2 m-0 font-light">
              Qual é a sua <span className="lp-tg font-extrabold">próxima conquista?</span>
            </h2>
          </div>
          <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {AUDIENCE.map((a) => (
              <div key={a.badge} className="lp-glass flex flex-col gap-3 rounded-3xl p-8">
                <span
                  className={`self-start rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] ${
                    a.gold
                      ? "border-[#F5B82E]/45 bg-[#F5B82E]/[.14] text-[#FFD670]"
                      : "border-[#6E8BFF]/40 bg-[#6E8BFF]/[.16] text-[#B9C8FF]"
                  }`}
                >
                  {a.badge}
                </span>
                <h3 className="m-0 text-[22px] font-extrabold">{a.title}</h3>
                <p className="m-0 text-[#A3AECF]">{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CALCULADORA ============ */}
      <section id="calculadora" className={`${SECTION} bg-[#060A18] pb-16 pt-4 sm:pb-[110px] sm:pt-10`}>
        <div
          className={`${WRAP} flex flex-wrap items-center justify-between gap-8 overflow-hidden rounded-[32px] px-6 py-14 sm:px-[52px] sm:py-[60px]`}
          style={{
            background:
              "radial-gradient(ellipse 60% 120% at 100% 0%, rgba(245,184,46,0.35), transparent 60%), linear-gradient(120deg, #1F3FB8 0%, #2F55E4 50%, #4C6FF5 100%)",
            boxShadow: "0 30px 80px rgba(47,85,228,0.35)",
          }}
        >
          <div className="lp-dots pointer-events-none absolute inset-0" />
          <div className="relative flex min-w-0 flex-1 basis-[480px] flex-col gap-3">
            <h2 className="lp-h2-cta m-0 font-light">
              Seu preço está <b className="font-extrabold">dando lucro?</b>
            </h2>
            <p className="m-0 text-lg text-[#E3E9FF]">
              Use a calculadora da TAKT e descubra a margem real de cada venda, com taxas e custos de cada
              marketplace.
            </p>
          </div>
          <Link
            href="/calculadora"
            className="lp-btn lp-btn-gold relative px-8 py-[18px] text-base font-extrabold"
          >
            Acessar a calculadora
          </Link>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section
        id="faq"
        className={`${SECTION} py-16 sm:py-[110px]`}
        style={{ background: "linear-gradient(180deg, #060A18, #0A1230 50%, #060A18)" }}
      >
        <div className="relative mx-auto flex w-full max-w-[860px] flex-col gap-10">
          <div className="flex flex-col gap-5">
            <span className="lp-eyebrow">Dúvidas frequentes</span>
            <h2 className="lp-h2-sm m-0 font-light">
              Perguntas que <span className="lp-tb font-extrabold">sempre recebemos</span>
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQ.map(([question, answer]) => (
              <details key={question} className="lp-glass rounded-[18px] px-[26px] py-5">
                <summary className="flex min-h-[44px] items-center justify-between gap-4 text-lg font-bold">
                  {question}
                  <span
                    className="lp-faq-plus text-[26px] font-light transition-transform duration-200"
                    style={{ color: GOLD }}
                  >
                    +
                  </span>
                </summary>
                <p className="mb-0 mt-3 text-[#A3AECF]">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CONTATO ============ */}
      <section
        id="contato"
        className={`${SECTION} py-16 sm:py-[120px]`}
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 15% 40%, rgba(245,184,46,0.20), transparent 70%), radial-gradient(ellipse 55% 65% at 90% 60%, rgba(47,85,228,0.40), transparent 70%), linear-gradient(180deg, #060A18, #0A1230)",
        }}
      >
        <div className="lp-dots pointer-events-none absolute inset-0" />
        <div className={`${WRAP} flex flex-wrap items-center gap-10 sm:gap-16`}>
          <div className="flex min-w-0 flex-1 basis-[440px] flex-col gap-[22px]">
            <span className="lp-eyebrow">Fale com a TAKT</span>
            <h2 className="lp-h2-lg m-0 font-light">
              Pronto para a sua <span className="lp-tg font-extrabold">próxima conquista?</span>
            </h2>
            <p className="m-0 max-w-[520px] text-[19px] text-[#A3AECF]">
              Preencha o formulário e um especialista da TAKT entra em contato para um diagnóstico da sua
              operação nos marketplaces.
            </p>
            <div className="flex flex-col gap-3 font-medium text-[#DDE3F7]">
              <div className="flex items-center gap-2.5">
                <Check size={20} />
                Diagnóstico sem compromisso
              </div>
              <div className="flex items-center gap-2.5">
                <Check size={20} />
                Conversa direta com um especialista
              </div>
              <div className="flex items-center gap-2.5">
                <Check size={20} />
                Resposta pelo WhatsApp que você deixar
              </div>
            </div>
          </div>
          <LandingLeadForm />
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-white/[.06] bg-[#04070F] px-6 pb-10 pt-14">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-start justify-between gap-9">
          <div className="flex min-w-0 flex-1 basis-[320px] flex-col gap-3.5">
            <Image src="/takt-logo-branco.png" alt="TAKT Assessoria" width={126} height={40} className="h-10 w-auto self-start" />
            <p className="m-0 max-w-[380px] text-[#A3AECF]">
              Assessoria especializada em Mercado Livre, Amazon, Shopee, TikTok Shop e Shein.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 font-medium">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="!text-[#C9D2F2] no-underline hover:!text-white">
                {item.label}
              </a>
            ))}
            <Link href="/login" className="!text-[#C9D2F2] no-underline hover:!text-white">
              Área do cliente
            </Link>
          </div>
          <div className="flex flex-col gap-2.5 text-[#A3AECF]">
            <span className="font-bold text-white">Contato</span>
            <span>WhatsApp: [NÚMERO]</span>
            <span>E-mail: [E-MAIL]</span>
            <span>Instagram: [@PERFIL]</span>
          </div>
        </div>
        <div className="mx-auto mt-10 w-full max-w-[1200px] border-t border-white/[.06] pt-6 text-sm text-[#7E8AB0]">
          © 2026 TAKT Assessoria · CNPJ [NÚMERO]
        </div>
      </footer>
    </div>
  );
}
