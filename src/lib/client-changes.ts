import { MARKETPLACES } from "@/lib/marketplaces";
import type { ClientChangeCategory, ClientChangeStatus } from "@/lib/types";

export const CHANGE_CHANNELS = [
  ...MARKETPLACES,
  { value: "site_proprio", label: "Site próprio" },
  { value: "outro", label: "Outro" },
] as const;

export const CHANGE_CHANNEL_LABEL: Record<string, string> = Object.fromEntries(
  CHANGE_CHANNELS.map((c) => [c.value, c.label]),
);

export const CHANGE_CATEGORIES: { value: ClientChangeCategory; label: string }[] = [
  { value: "preco", label: "Preço" },
  { value: "oferta", label: "Oferta" },
  { value: "campanha", label: "Campanha" },
  { value: "estoque", label: "Estoque" },
  { value: "atendimento_amazon", label: "Atendimento / Chamado Amazon" },
  { value: "conteudo", label: "Conteúdo" },
  { value: "avaliacao", label: "Avaliação" },
  { value: "outro", label: "Outro" },
];

export const CHANGE_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CHANGE_CATEGORIES.map((c) => [c.value, c.label]),
);

export const CHANGE_STATUSES: { value: ClientChangeStatus; label: string }[] = [
  { value: "aberta", label: "Aberta" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "monitorando", label: "Monitorando" },
];

export const CHANGE_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  CHANGE_STATUSES.map((s) => [s.value, s.label]),
);

export const CHANGE_STATUS_BADGE: Record<ClientChangeStatus, string> = {
  aberta: "bg-brand-gray text-navy",
  em_andamento: "bg-blue/10 text-blue",
  concluida: "bg-green-100 text-green-700",
  monitorando: "bg-yellow/20 text-[#8a6d1a]",
};
