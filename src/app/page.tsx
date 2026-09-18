import { createClient } from "@/lib/supabase/server";
import { logout } from "./logout/actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-black/[.08] px-6 py-4 dark:border-white/[.145]">
        <span className="text-sm font-semibold text-black dark:text-zinc-50">
          taktgestao
        </span>
        <form action={logout} className="flex items-center gap-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {user?.email}
          </span>
          <button
            type="submit"
            className="rounded border border-black/[.08] px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
          >
            Sair
          </button>
        </form>
      </header>

      <main className="flex flex-1 items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          Dashboard em construção.
        </p>
      </main>
    </div>
  );
}
