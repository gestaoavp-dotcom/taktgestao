"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// The new password goes from this form straight to Supabase, through the
// browser's own session. It never passes through our server, so nothing here
// ever holds it — which is the point of making people choose their own.

const MIN = 8;

const INPUT_CLASS =
  "w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent";

export function ChangePasswordForm({ required }: { required: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN) {
      setError(`A senha precisa ter pelo menos ${MIN} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError("As duas senhas não são iguais.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    // Recorded only after Supabase accepted it, so a failed change never
    // counts as done and lets someone past with the temporary password.
    await supabase.rpc("mark_password_changed");
    // First access carries on to finishing the registration; the page itself
    // sends anyone who isn't a client straight on to the start.
    router.push(required ? "/boas-vindas" : "/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="lift flex flex-col gap-3 rounded-2xl bg-panel p-5 shadow-sm">
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
          Nova senha
        </span>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={`Pelo menos ${MIN} caracteres`}
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
          Repita a nova senha
        </span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={INPUT_CLASS}
        />
      </label>

      {error && <p className="rounded bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center justify-center gap-2 rounded-lg bg-action py-2.5 text-sm font-semibold text-on-accent transition-colors hover:opacity-90 disabled:opacity-60"
      >
        <KeyRound className="h-4 w-4" />
        {saving ? "Salvando..." : required ? "Definir e entrar" : "Salvar nova senha"}
      </button>

      {required && (
        <p className="text-center text-xs text-ink-3">
          Não dá para pular esta etapa.
        </p>
      )}
    </form>
  );
}
