import { createClient } from "@/lib/supabase/server";
import type { ClientLink } from "@/lib/types";
import { ClientLinksCard } from "@/components/client-links-card";

export default async function ClienteLinksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("client_links")
    .select("*")
    .eq("client_id", id)
    .order("created_at")
    .returns<ClientLink[]>();

  return <ClientLinksCard clientId={id} links={links ?? []} />;
}
