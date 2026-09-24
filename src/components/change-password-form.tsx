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
  "w-full rounded-lg border border-navy/10 bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue";

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
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg bg-white p-5 shadow-sm">
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
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
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
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

      {error && <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center justify-center gap-2 rounded-lg bg-navy py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0d1a38] disabled:opacity-60"
      >
        <KeyRound className="h-4 w-4" />
        {saving ? "Salvando..." : required ? "Definir e entrar" : "Salvar nova senha"}
      </button>

      {required && (
        <p className="text-center text-xs text-[#94A0BD]">
          Não dá para pular esta etapa.
        </p>
      )}
    </form>
  );
}
