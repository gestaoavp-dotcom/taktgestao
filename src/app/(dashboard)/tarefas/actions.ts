"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  await supabase.from("tasks").insert({
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    client_id: (formData.get("client_id") as string) || null,
    priority: formData.get("priority") as string,
    due_date: (formData.get("due_date") as string) || null,
    status: (formData.get("status") as string) || "todo",
    // A task with no owner is a task nobody picks up, so it starts with
    // whoever wrote it unless they chose someone else.
    assigned_to: (formData.get("assigned_to") as string) || auth.user.id,
    created_by: auth.user.id,
  });

  revalidatePath("/tarefas");
}

export async function updateTaskStatus(formData: FormData) {
  const supabase = await createClient();

  await supabase
    .from("tasks")
    .update({ status: formData.get("status") as string })
    .eq("id", formData.get("id") as string);

  revalidatePath("/tarefas");
}

/** Used by the board when a card is dropped in another column. */
export async function moveTask(id: string, status: string) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ status }).eq("id", id);
  revalidatePath("/tarefas");
}

export async function updateTask(formData: FormData) {
  const supabase = await createClient();

  await supabase
    .from("tasks")
    .update({
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      client_id: (formData.get("client_id") as string) || null,
      priority: formData.get("priority") as string,
      due_date: (formData.get("due_date") as string) || null,
      assigned_to: (formData.get("assigned_to") as string) || null,
    })
    .eq("id", formData.get("id") as string);

  revalidatePath("/tarefas");
}

export async function deleteTask(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", formData.get("id") as string);
  revalidatePath("/tarefas");
}
