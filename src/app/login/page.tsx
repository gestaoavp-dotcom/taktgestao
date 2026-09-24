import { BackLink } from "@/components/back-link";
import { Logo } from "@/components/logo";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-gray px-4">
      <div className="w-full max-w-sm rounded-xl border border-navy/10 bg-white p-8 shadow-sm">
        <BackLink />
        <div className="mb-6">
          <Logo height={40} />
        </div>
        <p className="mb-6 text-sm text-[color:var(--brand-text-secondary)]">
          Entre com seu email e senha
        </p>

        {error && (
          <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </p>
        )}

        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-navy">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded border border-navy/15 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-blue"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-navy">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="rounded border border-navy/15 bg-transparent px-3 py-2 text-sm text-navy outline-none focus:border-blue"
            />
          </div>

          <div className="mt-2 flex flex-col gap-2">
            <button
              formAction={login}
              className="flex h-10 w-full items-center justify-center rounded bg-navy text-sm font-medium text-white transition-colors hover:bg-[#0d1a38]"
            >
              Entrar
            </button>
          </div>
          <p className="text-center text-xs text-[#94A0BD]">
            Os acessos são criados pela equipe TAKT.
          </p>
        </form>
      </div>
    </div>
  );
}
