import { createClient } from "@/lib/supabase/server";
import type { Client, Profile, Task } from "@/lib/types";
import { TasksBoard } from "@/components/tasks-board";

export default async function TarefasPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  // Stands in for a trigger on auth.users, which cannot be created from the
  // SQL editor. Inserts nothing when a profile already exists.
  if (auth.user) await supabase.rpc("ensure_profile", { user_name: null });

  const [{ data: tasks }, { data: clients }, { data: profiles }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, clients(name)")
      .order("created_at", { ascending: false })
      .returns<(Task & { clients: { name: string } | null })[]>(),
    supabase.from("clients").select("*").order("name").returns<Client[]>(),
    // Everyone a task can be handed to. Falls back to nobody when the profiles
    // table is not in place yet, which only costs the assignee picker.
    supabase.from("profiles").select("*").order("name").returns<Profile[]>(),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-navy">Tarefas</h1>
      <TasksBoard
        tasks={tasks ?? []}
        clients={clients ?? []}
        profiles={profiles ?? []}
        currentUserId={auth.user?.id ?? ""}
      />
    </div>
  );
}
