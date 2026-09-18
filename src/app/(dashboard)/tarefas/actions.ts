"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const title = formData.get("title") as string;
  const client_id = (formData.get("client_id") as string) || null;
  const priority = formData.get("priority") as string;
  const due_date = (formData.get("due_date") as string) || null;

  await supabase.from("tasks").insert({
    title,
    client_id,
    priority,
    due_date,
    created_by: auth.user?.id,
  });

  revalidatePath("/tarefas");
}

export async function updateTaskStatus(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;

  await supabase.from("tasks").update({ status }).eq("id", id);

  revalidatePath("/tarefas");
}

export async function deleteTask(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  await supabase.from("tasks").delete().eq("id", id);

  revalidatePath("/tarefas");
}
