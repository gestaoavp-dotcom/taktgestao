import { getNotifications } from "@/lib/notifications";
import { currentUser, getProfile } from "@/lib/profile";
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
  const [user, profile] = await Promise.all([currentUser(), getProfile()]);
  const team = profile?.role === "dono" || profile?.role === "operador";
  // The reminders are the agency's own receivables and payables — a client's
  // monthly fee among them — so a client login gets none. Not awaited: three
  // queries to decide whether a dot appears over an icon used to hold back
  // every page under this layout. It arrives on its own, into a Suspense
  // boundary in the header, and never rejects into one.
  const notifications = team ? getNotifications().catch(() => []) : Promise.resolve([]);

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
