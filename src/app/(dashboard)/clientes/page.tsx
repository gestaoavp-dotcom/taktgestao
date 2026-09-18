import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/types";
import { ClientsView } from "@/components/clients-view";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("name")
    .returns<Client[]>();

  return <ClientsView clients={clients ?? []} />;
}
