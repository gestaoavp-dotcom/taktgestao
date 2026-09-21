import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications";
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
  const notifications = await getNotifications();

  return (
    <DashboardShell email={user?.email} notifications={notifications}>
      {children}
    </DashboardShell>
  );
}
