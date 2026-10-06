"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Columns3,
  List,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Client, Profile, Task } from "@/lib/types";
import { DateField } from "@/components/date-field";
import { createTask, deleteTask, moveTask } from "@/app/(dashboard)/tarefas/actions";

// Three ways to read the same list, because the questions differ: the board
// asks what is moving, the calendar asks what is due, the list asks what there
// is. Everything else — who owns it, which client — is shared between them.

type View = "quadro" | "calendario" | "lista";

const COLUMNS: { value: Task["status"]; label: string }[] = [
  { value: "todo", label: "A fazer" },
  { value: "in_progress", label: "Em andamento" },
  { value: "done", label: "Concluída" },
];

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const PRIORITY_BADGE: Record<Task["priority"], string> = {
  low: "bg-panel-2 text-ink-2",
  medium: "bg-accent/10 text-accent-ink",
  high: "bg-gold text-ink",
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const INPUT_CLASS =
  "w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent";

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function personName(profiles: Profile[], id: string | null) {
  if (!id) return null;
  const p = profiles.find((x) => x.id === id);
  return p?.name ?? p?.email ?? null;
}

/** First letters of a name, for the avatar on a card. */
function initials(name: string) {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function TaskCard({
  task,
  clients,
  profiles,
  onDragStart,
}: {
  task: Task & { clients?: { name: string } | null };
  clients: Client[];
  profiles: Profile[];
  onDragStart?: () => void;
}) {
  const owner = personName(profiles, task.assigned_to);
  const client = task.clients?.name ?? clients.find((c) => c.id === task.client_id)?.name;
  const late =
    task.due_date && task.status !== "done" && task.due_date < toISO(new Date());

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      className={`group rounded-lg border border-line bg-panel p-3 shadow-sm transition-shadow ${
        onDragStart ? "cursor-grab active:cursor-grabbing hover:shadow-md" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{task.title}</p>
        <form action={deleteTask}>
          <input type="hidden" name="id" value={task.id} />
          <button
            type="submit"
            aria-label={`Remover ${task.title}`}
            className="rounded p-1 text-ink-3 opacity-0 transition-all hover:bg-danger/10 hover:text-danger focus:opacity-100 group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-ink-2">{task.description}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_BADGE[task.priority]}`}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
        {client && (
          <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[10px] font-semibold text-ink-2">
            {client}
          </span>
        )}
        {task.due_date && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              late ? "bg-danger/10 text-danger" : "bg-panel-2 text-ink-2"
            }`}
          >
            {formatDate(task.due_date)}
          </span>
        )}
        {owner && (
          <span
            title={owner}
            className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-action text-[9px] font-bold text-on-accent"
          >
            {initials(owner)}
          </span>
        )}
      </div>
    </div>
  );
}

export function TasksBoard({
  tasks,
  clients,
  profiles,
  currentUserId,
}: {
  tasks: (Task & { clients?: { name: string } | null })[];
  clients: Client[];
  profiles: Profile[];
  currentUserId: string;
}) {
  const [view, setView] = useState<View>("quadro");
  const [mine, setMine] = useState(true);
  const [adding, setAdding] = useState<Task["status"] | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const visible = useMemo(
    () => (mine ? tasks.filter((t) => t.assigned_to === currentUserId) : tasks),
    [tasks, mine, currentUserId],
  );

  const mineCount = tasks.filter((t) => t.assigned_to === currentUserId).length;

  async function drop(status: Task["status"]) {
    if (!dragging) return;
    const id = dragging;
    setDragging(null);
    await moveTask(id, status);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-panel-2 p-1">
          {([
            { value: "quadro", label: "Quadro", icon: Columns3 },
            { value: "calendario", label: "Calendário", icon: CalendarDays },
            { value: "lista", label: "Lista", icon: List },
          ] as const).map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => setView(v.value)}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                view === v.value ? "bg-panel text-ink shadow-sm" : "text-ink-2 hover:text-ink"
              }`}
            >
              <v.icon className="h-4 w-4" />
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 rounded-lg bg-panel-2 p-1">
          <button
            type="button"
            onClick={() => setMine(true)}
            className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
              mine ? "bg-panel text-ink shadow-sm" : "text-ink-2 hover:text-ink"
            }`}
          >
            Minhas ({mineCount})
          </button>
          <button
            type="button"
            onClick={() => setMine(false)}
            className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
              !mine ? "bg-panel text-ink shadow-sm" : "text-ink-2 hover:text-ink"
            }`}
          >
            Da equipe ({tasks.length})
          </button>
        </div>
      </div>

      {view === "quadro" && (
        <div className="grid grid-cols-3 gap-4">
          {COLUMNS.map((column) => {
            const columnTasks = visible.filter((t) => t.status === column.value);
            return (
              <div
                key={column.value}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => drop(column.value)}
                className="flex flex-col gap-2 rounded-lg bg-panel-2/50 p-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-ink">
                    {column.label}
                    <span className="ml-2 text-ink-3">{columnTasks.length}</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setAdding(adding === column.value ? null : column.value)}
                    aria-label={`Nova tarefa em ${column.label}`}
                    className="rounded p-1 text-ink-3 hover:bg-panel hover:text-ink"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {adding === column.value && (
                  <form
                    action={async (formData) => {
                      await createTask(formData);
                      setAdding(null);
                    }}
                    className="flex flex-col gap-2 rounded-lg border border-accent/30 bg-panel p-3"
                  >
                    <input type="hidden" name="status" value={column.value} />
                    <input
                      name="title"
                      required
                      autoFocus
                      placeholder="O que precisa ser feito"
                      className={INPUT_CLASS}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select name="priority" defaultValue="medium" className={INPUT_CLASS}>
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                      </select>
                      <DateField name="due_date" placeholder="Prazo" />
                    </div>
                    <select name="client_id" defaultValue="" className={INPUT_CLASS}>
                      <option value="">Sem cliente</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      name="assigned_to"
                      defaultValue={currentUserId}
                      className={INPUT_CLASS}
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name ?? p.email}
                          {p.id === currentUserId ? " (eu)" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-lg bg-action py-2 text-sm font-semibold text-on-accent hover:opacity-90"
                    >
                      Adicionar
                    </button>
                  </form>
                )}

                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    clients={clients}
                    profiles={profiles}
                    onDragStart={() => setDragging(task.id)}
                  />
                ))}

                {!columnTasks.length && adding !== column.value && (
                  <p className="py-6 text-center text-xs text-ink-3">
                    Arraste uma tarefa para cá
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === "calendario" && (
        <CalendarView
          tasks={visible}
          clients={clients}
          profiles={profiles}
          year={month.year}
          month={month.month}
          onMonth={setMonth}
        />
      )}

      {view === "lista" && (
        <div className="overflow-hidden rounded-lg bg-panel shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel-2">
              <tr>
                <th className="px-5 py-2 font-semibold text-ink">Tarefa</th>
                <th className="px-4 py-2 font-semibold text-ink">Cliente</th>
                <th className="px-4 py-2 font-semibold text-ink">Responsável</th>
                <th className="px-4 py-2 font-semibold text-ink">Prazo</th>
                <th className="px-4 py-2 font-semibold text-ink">Prioridade</th>
                <th className="px-4 py-2 font-semibold text-ink">Status</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((task) => {
                const late =
                  task.due_date && task.status !== "done" && task.due_date < toISO(new Date());
                return (
                  <tr key={task.id} className="border-t border-line-soft">
                    <td className="px-5 py-2.5 text-ink">{task.title}</td>
                    <td className="px-4 py-2.5 text-ink-2">
                      {task.clients?.name ??
                        clients.find((c) => c.id === task.client_id)?.name ??
                        "—"}
                    </td>
                    <td className="px-4 py-2.5 text-ink-2">
                      {personName(profiles, task.assigned_to) ?? "—"}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-2.5 ${
                        late ? "font-semibold text-danger" : "text-ink-2"
                      }`}
                    >
                      {task.due_date ? formatDate(task.due_date) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_BADGE[task.priority]}`}
                      >
                        {PRIORITY_LABEL[task.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-ink-2">
                      {COLUMNS.find((c) => c.value === task.status)?.label}
                    </td>
                    <td className="px-2 py-2.5">
                      <form action={deleteTask}>
                        <input type="hidden" name="id" value={task.id} />
                        <button
                          type="submit"
                          aria-label={`Remover ${task.title}`}
                          className="rounded p-1.5 text-ink-3 hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {!visible.length && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-ink-3">
                    Nenhuma tarefa. Crie uma no quadro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CalendarView({
  tasks,
  clients,
  profiles,
  year,
  month,
  onMonth,
}: {
  tasks: (Task & { clients?: { name: string } | null })[];
  clients: Client[];
  profiles: Profile[];
  year: number;
  month: number;
  onMonth: (m: { year: number; month: number }) => void;
}) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = first.getDay();

  const byDate = new Map<string, typeof tasks>();
  for (const task of tasks) {
    if (!task.due_date) continue;
    byDate.set(task.due_date, [...(byDate.get(task.due_date) ?? []), task]);
  }

  // Tasks with no date belong to no square, and hiding them would make the
  // calendar quietly disagree with the board.
  const undated = tasks.filter((t) => !t.due_date);

  const cells = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const today = toISO(new Date());

  const shift = (by: number) => {
    const d = new Date(year, month + by, 1);
    onMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Mês anterior"
          className="rounded-lg border border-line p-1.5 text-ink hover:bg-panel-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="font-bold text-ink">
          {MONTHS[month]} de {year}
        </h2>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Próximo mês"
          className="rounded-lg border border-line p-1.5 text-ink hover:bg-panel-2"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-hidden rounded-lg bg-panel shadow-sm">
        <div className="grid grid-cols-7 border-b border-line bg-panel-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-bold text-ink-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null) return <div key={`vazio-${i}`} className="min-h-[104px] bg-panel-2/20" />;
            const iso = toISO(new Date(year, month, day));
            const dayTasks = byDate.get(iso) ?? [];

            return (
              <div
                key={iso}
                className={`min-h-[104px] border-b border-r border-line-soft p-1.5 ${
                  iso === today ? "bg-accent/[.04]" : ""
                }`}
              >
                <p
                  className={`mb-1 text-xs font-bold ${
                    iso === today ? "text-accent-ink" : "text-ink-3"
                  }`}
                >
                  {day}
                </p>
                <div className="flex flex-col gap-1">
                  {dayTasks.map((task) => (
                    <div
                      key={task.id}
                      title={task.title}
                      className={`truncate rounded px-1.5 py-1 text-[11px] font-semibold ${
                        task.status === "done"
                          ? "bg-pos/10 text-pos line-through"
                          : iso < today
                            ? "bg-danger/10 text-danger"
                            : PRIORITY_BADGE[task.priority]
                      }`}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {undated.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-3">
            Sem prazo ({undated.length})
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {undated.map((task) => (
              <TaskCard key={task.id} task={task} clients={clients} profiles={profiles} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
