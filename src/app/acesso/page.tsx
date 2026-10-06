import type { Metadata } from "next";
import { KeyRound, TriangleAlert } from "lucide-react";
import { Logo } from "@/components/logo";
import { redeemAccessLink } from "./actions";

export const metadata: Metadata = {
  title: "Acesso | TAKT Assessoria",
  robots: { index: false },
};

export default async function AcessoPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; erro?: string }>;
}) {
  const { token_hash, erro } = await searchParams;
  const invalid = !!erro || !token_hash;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="lift w-full max-w-sm rounded-2xl border border-line bg-panel p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo height={40} />
        </div>

        {invalid ? (
          <>
            <TriangleAlert className="mx-auto h-10 w-10 text-gold-ink" />
            <h1 className="mt-4 text-lg font-bold text-ink">Este link não vale mais</h1>
            <p className="mt-2 text-sm text-ink-2">
              Ele já foi usado ou expirou. Peça um novo link de acesso à equipe TAKT.
            </p>
          </>
        ) : (
          <>
            <KeyRound className="mx-auto h-10 w-10 text-accent-ink" />
            <h1 className="mt-4 text-lg font-bold text-ink">Seu acesso à TAKT</h1>
            <p className="mt-2 text-sm text-ink-2">
              Crie a sua senha para entrar e conferir os dados do seu cadastro.
            </p>
            <form action={redeemAccessLink} className="mt-6">
              <input type="hidden" name="token_hash" value={token_hash} />
              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center rounded-lg bg-action text-sm font-semibold text-on-accent transition-colors hover:opacity-90"
              >
                Criar minha senha
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
