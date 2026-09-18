import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/logout/actions";
import { NavLinks } from "@/components/nav-links";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
      <aside className="flex w-56 flex-col justify-between border-r border-black/[.08] p-4 dark:border-white/[.145]">
        <div>
          <div className="mb-6 px-3 text-sm font-semibold text-black dark:text-zinc-50">
            taktgestao
          </div>
          <NavLinks />
        </div>

        <form action={logout} className="flex flex-col gap-2 px-1">
          <span className="truncate px-2 text-xs text-zinc-500 dark:text-zinc-400">
            {user?.email}
          </span>
          <button
            type="submit"
            className="rounded border border-black/[.08] px-3 py-1.5 text-left text-sm font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
          >
            Sair
          </button>
        </form>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
