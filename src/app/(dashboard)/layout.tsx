import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications";
import { isTeam } from "@/lib/profile";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const team = await isTeam();
  const notifications = await getNotifications();

  return (
    <DashboardShell email={user?.email} team={team} notifications={notifications}>
      {children}
    </DashboardShell>
  );
}
