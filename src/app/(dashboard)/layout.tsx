import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications";
import { getProfile } from "@/lib/profile";
import { DashboardShell } from "@/components/dashboard-shell";

const ROLE_LABEL: Record<string, string> = {
  dono: "Admin",
  operador: "Equipe",
  cliente: "Cliente",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getProfile();
  const team = profile?.role === "dono" || profile?.role === "operador";
  // The reminders are the agency's own receivables and payables — a client's
  // monthly fee among them — so a client login gets none.
  const notifications = team ? await getNotifications() : [];

  return (
    <DashboardShell
      email={user?.email}
      roleLabel={ROLE_LABEL[profile?.role ?? ""] ?? ""}
      team={team}
      notifications={notifications}
    >
      {children}
    </DashboardShell>
  );
}
