import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { ChangePasswordForm } from "@/components/change-password-form";

export default async function TrocarSenhaPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  await supabase.rpc("ensure_profile", { user_name: null });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .maybeSingle<Profile>();

  // Nothing to force once it has been done; the page stays reachable so anyone
  // can change their password whenever they like.
  const required = !profile?.password_changed_at;

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="mb-1 font-display text-2xl font-bold text-navy">
        {required ? "Defina sua senha" : "Trocar senha"}
      </h1>
      <p className="mb-6 text-sm text-[#5B647E]">
        {required
          ? "Escolha a sua senha para continuar. Só você vai saber qual é — nem quem criou o seu acesso consegue vê-la."
          : "Escolha uma nova senha para o seu acesso."}
      </p>
      <ChangePasswordForm required={required} />
    </div>
  );
}
