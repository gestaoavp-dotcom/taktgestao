import type { Metadata } from "next";
import { Clock, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { logout } from "@/app/logout/actions";

export const metadata: Metadata = {
  title: "Acesso aguardando liberação | TAKT Assessoria",
};

// Where the middleware keeps any login the owner has not placed yet. Creating
// the profile here (at the lowest level, with no client) is what makes the
// login show up in Configurações, where a dono approves it by binding it to a
// registered client.
export default async function AguardandoPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) await supabase.rpc("ensure_profile", { user_name: null });

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-gray px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-navy/10 bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo height={40} />
        </div>
        <Clock className="mx-auto h-10 w-10 text-yellow" />
        <h1 className="mt-4 text-lg font-bold text-navy">Seu acesso ainda não foi liberado</h1>
        <p className="mt-2 text-sm text-[#5B647E]">
          A equipe TAKT precisa aprovar este login antes do primeiro acesso. Se você é
          cliente e ainda não falou com a gente, entre em contato.
        </p>
        {auth.user?.email && (
          <p className="mt-4 text-xs text-[#94A0BD]">Conectado como {auth.user.email}</p>
        )}
        <form action={logout} className="mt-6">
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-navy/10 text-sm font-semibold text-[#5B647E] transition-colors hover:bg-brand-gray hover:text-navy"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
