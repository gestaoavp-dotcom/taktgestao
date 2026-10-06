import { BackLink } from "@/components/back-link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { login } from "./actions";

const FIELD =
  "rounded-xl border border-line bg-panel-2 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="glow flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="relative w-full max-w-sm rounded-3xl border border-line bg-panel p-8 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <BackLink />
          <ThemeToggle />
        </div>
        <div className="mb-6">
          <Logo height={40} />
        </div>
        <p className="mb-6 text-sm text-ink-2">Entre com seu email e senha</p>

        {error && (
          <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        {message && (
          <p className="mb-4 rounded-xl border border-gold/40 bg-gold/10 px-3.5 py-2.5 text-sm font-medium text-gold-ink">
            {message}
          </p>
        )}

        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-semibold text-ink">
              Email
            </label>
            <input id="email" name="email" type="email" required className={FIELD} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-ink">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className={FIELD}
            />
          </div>

          {/* The one gold thing on the screen, which is the rule. */}
          <button
            formAction={login}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-full bg-gold text-sm font-extrabold text-on-gold transition-opacity hover:opacity-90"
          >
            Entrar
          </button>
          <p className="text-center text-xs text-ink-3">
            Os acessos são criados pela equipe TAKT.
          </p>
        </form>
      </div>
    </div>
  );
}
