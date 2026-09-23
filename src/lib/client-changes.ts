import { MARKETPLACES, MARKETPLACE_LABEL } from "@/lib/marketplaces";
import type { ClientAccount, ClientChangeCategory, ClientChangeStatus } from "@/lib/types";

/** A change is logged against a marketplace the client actually sells on. */
export const CHANGE_CHANNELS = [...MARKETPLACES] as const;

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

/**
 * One entry per channel a change can be logged against: a specific store when
 * the client has an account for that marketplace — so two Mercado Livre stores
 * never get lumped together — otherwise the marketplace itself.
 *
 * Only marketplaces the client actually sells on appear. An option nobody can
 * use is a tab nobody clicks.
 */
export type ChangeChannelOption = {
  key: string;
  label: string;
  marketplace: string;
  accountId: string | null;
};

export function buildChannelOptions(
  accounts: ClientAccount[],
  clientMarketplaces: string[],
): ChangeChannelOption[] {
  const options: ChangeChannelOption[] = [];

  for (const channel of CHANGE_CHANNELS) {
    const channelAccounts = accounts.filter((a) => a.marketplace === channel.value);

    if (channelAccounts.length > 0) {
      for (const account of channelAccounts) {
        options.push({
          key: `account:${account.id}`,
          label: `${MARKETPLACE_LABEL[account.marketplace] ?? account.marketplace} — ${account.store_name}`,
          marketplace: account.marketplace,
          accountId: account.id,
        });
      }
    } else if (clientMarketplaces.includes(channel.value)) {
      options.push({
        key: `marketplace:${channel.value}`,
        label: channel.label,
        marketplace: channel.value,
        accountId: null,
      });
    }
  }

  return options;
}
