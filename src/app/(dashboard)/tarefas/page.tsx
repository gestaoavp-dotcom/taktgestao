import { createClient } from "@/lib/supabase/server";
import type { Client, Task } from "@/lib/types";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { DateField } from "@/components/date-field";
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

const PRIORITY_BADGE: Record<Task["priority"], string> = {
  low: "bg-brand-gray text-[#5B647E]",
  medium: "bg-blue/10 text-blue",
  high: "bg-yellow text-navy",
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
      <h1 className="mb-6 font-display text-2xl font-bold text-navy">Tarefas</h1>

      <form
        action={createTask}
        className="mb-8 grid max-w-2xl grid-cols-2 gap-3 rounded-lg bg-white p-4 shadow-sm"
      >
        <input
          name="title"
          placeholder="Título da tarefa"
          required
          className="col-span-2 rounded border border-navy/10 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-blue"
        />
        <select
          name="client_id"
          defaultValue=""
          className="rounded border border-navy/10 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-blue"
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
          className="rounded border border-navy/10 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-blue"
        >
          <option value="low">Prioridade baixa</option>
          <option value="medium">Prioridade média</option>
          <option value="high">Prioridade alta</option>
        </select>
        <DateField
          name="due_date"
          className="col-span-2 flex w-full items-center justify-between rounded border border-navy/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue"
        />
        <textarea
          name="description"
          placeholder="Observação (opcional)"
          rows={2}
          className="col-span-2 resize-none rounded border border-navy/10 bg-transparent px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue"
        />
        <button
          type="submit"
          className="col-span-2 mt-1 h-10 rounded bg-navy text-sm font-medium text-white transition-colors hover:bg-[#0d1a38]"
        >
          Adicionar tarefa
        </button>
      </form>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-gray">
            <tr>
              <th className="px-4 py-2 font-medium text-navy">Tarefa</th>
              <th className="px-4 py-2 font-medium text-navy">Cliente</th>
              <th className="px-4 py-2 font-medium text-navy">Prioridade</th>
              <th className="px-4 py-2 font-medium text-navy">Prazo</th>
              <th className="px-4 py-2 font-medium text-navy">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {tasks?.map((task) => (
              <tr key={task.id} className="border-t border-navy/[.08]">
                <td className="px-4 py-2 text-navy">
                  {task.title}
                  {task.description && (
                    <p className="mt-0.5 text-xs text-[#94A0BD]">{task.description}</p>
                  )}
                </td>
                <td className="px-4 py-2 text-[#5B647E]">{task.clients?.name ?? "—"}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[task.priority]}`}
                  >
                    {PRIORITY_LABEL[task.priority]}
                  </span>
                </td>
                <td className="px-4 py-2 text-[#5B647E]">{task.due_date ?? "—"}</td>
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
                      className="rounded border border-navy/10 bg-transparent px-2 py-1 text-xs text-navy outline-none"
                    />
                  </form>
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteTask}>
                    <input type="hidden" name="id" value={task.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!tasks?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[#94A0BD]">
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
