import { createClient } from "@/lib/supabase/server";
import type { Client, Task } from "@/lib/types";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { createTask, deleteTask, updateTaskStatus } from "./actions";

const STATUS_LABEL: Record<Task["status"], string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  done: "Concluída",
};

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export default async function TarefasPage() {
  const supabase = await createClient();

  const [{ data: tasks }, { data: clients }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, clients(name)")
      .order("created_at", { ascending: false })
      .returns<(Task & { clients: { name: string } | null })[]>(),
    supabase.from("clients").select("*").order("name").returns<Client[]>(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
        Tarefas
      </h1>

      <form
        action={createTask}
        className="mb-8 grid max-w-2xl grid-cols-2 gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
      >
        <input
          name="title"
          placeholder="Título da tarefa"
          required
          className="col-span-2 rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white"
        />
        <select
          name="client_id"
          defaultValue=""
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white"
        >
          <option value="">Sem cliente</option>
          {clients?.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <select
          name="priority"
          defaultValue="medium"
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white"
        >
          <option value="low">Prioridade baixa</option>
          <option value="medium">Prioridade média</option>
          <option value="high">Prioridade alta</option>
        </select>
        <input
          name="due_date"
          type="date"
          className="col-span-2 rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white"
        />
        <button
          type="submit"
          className="col-span-2 mt-1 h-10 rounded bg-foreground text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Adicionar tarefa
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-black/[.08] dark:border-white/[.145]">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/[.03] dark:bg-white/[.06]">
            <tr>
              <th className="px-4 py-2 font-medium text-black dark:text-zinc-50">Tarefa</th>
              <th className="px-4 py-2 font-medium text-black dark:text-zinc-50">Cliente</th>
              <th className="px-4 py-2 font-medium text-black dark:text-zinc-50">Prioridade</th>
              <th className="px-4 py-2 font-medium text-black dark:text-zinc-50">Prazo</th>
              <th className="px-4 py-2 font-medium text-black dark:text-zinc-50">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {tasks?.map((task) => (
              <tr key={task.id} className="border-t border-black/[.08] dark:border-white/[.145]">
                <td className="px-4 py-2 text-black dark:text-zinc-50">{task.title}</td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                  {task.clients?.name ?? "—"}
                </td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                  {PRIORITY_LABEL[task.priority]}
                </td>
                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                  {task.due_date ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <form action={updateTaskStatus} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={task.id} />
                    <AutoSubmitSelect
                      name="status"
                      defaultValue={task.status}
                      options={Object.entries(STATUS_LABEL).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      className="rounded border border-black/[.08] bg-transparent px-2 py-1 text-xs text-black outline-none dark:border-white/[.145] dark:text-zinc-50"
                    />
                  </form>
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteTask}>
                    <input type="hidden" name="id" value={task.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                    >
                      Excluir
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!tasks?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">
                  Nenhuma tarefa cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
