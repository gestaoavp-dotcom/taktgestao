import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/logout/actions";
import { NavLinks } from "@/components/nav-links";
import { Logo } from "@/components/logo";

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
    <div className="flex min-h-screen bg-brand-gray">
      <aside className="flex w-56 flex-col justify-between bg-navy p-4">
        <div>
          <div className="mb-8 px-2 pt-2">
            <Logo variant="light" />
          </div>
          <NavLinks />
        </div>

        <form action={logout} className="flex flex-col gap-2 px-1">
          <span className="truncate px-2 text-xs text-white/50">
            {user?.email}
          </span>
          <button
            type="submit"
            className="rounded border border-white/15 px-3 py-1.5 text-left text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            Sair
          </button>
        </form>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
