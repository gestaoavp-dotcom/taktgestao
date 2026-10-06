import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Client, Profile } from "@/lib/types";
import { currentUser } from "@/lib/profile";
import { AccessSettings } from "@/components/access-settings";
import { EmailSettings } from "@/components/email-settings";
import { emailSender } from "@/lib/email";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const user = await currentUser();

  if (user) await supabase.rpc("ensure_profile", { user_name: null });

  const [{ data: me }, { data: profiles }, { data: clients }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id ?? "")
      .maybeSingle<Profile>(),
    supabase.from("profiles").select("*").order("role").returns<Profile[]>(),
    supabase.from("clients").select("*").order("name").returns<Client[]>(),
  ]);

  if (me?.role !== "dono") {
    return (
      <div>
        <h1 className="mb-6 font-display text-2xl font-bold text-ink">Configurações</h1>
        <p className="lift flex items-center gap-2 rounded-2xl bg-panel px-5 py-10 text-sm text-ink-3 shadow-sm">
          <ShieldAlert className="h-4 w-4" />
          Só o dono da conta gerencia os acessos.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-ink">Configurações</h1>
      <p className="mb-6 text-sm text-ink-2">Quem entra no sistema e até onde cada um vê.</p>

      <EmailSettings sender={emailSender()} adminEmail={user?.email ?? ""} />

      <AccessSettings
        profiles={profiles ?? []}
        clients={clients ?? []}
        currentUserId={user?.id ?? ""}
      />
    </div>
  );
}
