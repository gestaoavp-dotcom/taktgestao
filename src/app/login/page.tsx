import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="mb-1 text-xl font-semibold text-black dark:text-zinc-50">
          taktgestao
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Entre com seu email e senha
        </p>

        {error && (
          <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        {message && (
          <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            {message}
          </p>
        )}

        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-black dark:text-zinc-50">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-black dark:text-zinc-50">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-black dark:border-white/[.145] dark:text-zinc-50 dark:focus:border-white"
            />
          </div>

          <div className="mt-2 flex flex-col gap-2">
            <button
              formAction={login}
              className="flex h-10 w-full items-center justify-center rounded bg-foreground text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Entrar
            </button>
            <button
              formAction={signup}
              className="flex h-10 w-full items-center justify-center rounded border border-black/[.08] text-sm font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
            >
              Criar conta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
