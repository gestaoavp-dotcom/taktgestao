import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // The public pages are for people with no login at all.
  if (
    request.nextUrl.pathname.startsWith("/contato") ||
    request.nextUrl.pathname.startsWith("/inicio") ||
    request.nextUrl.pathname.startsWith("/calculadora") ||
    request.nextUrl.pathname.startsWith("/acesso")
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/login");
  const isPasswordRoute = pathname.startsWith("/trocar-senha");

  // A visitor at the root gets the public front page, under the same address.
  if (!user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/inicio";
    return NextResponse.rewrite(url);
  }

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, client_id, password_changed_at")
      .eq("id", user.id)
      .maybeSingle<{
        role: string;
        client_id: string | null;
        password_changed_at: string | null;
      }>();

    // A login that has never chosen its own password may come in only through
    // its one-time link. A session opened with a password means a password
    // someone else set — a leftover temporary one, or a sign-up made outside
    // the app — so it is ended here, before any other rule, and above all
    // before /trocar-senha, where it could otherwise take the login over.
    if (!profile?.password_changed_at) {
      const { data: claimsData } = await supabase.auth.getClaims();
      const amr = (claimsData?.claims.amr ?? []) as (string | { method: string })[];
      const byPassword = amr.some((m) => (typeof m === "string" ? m : m.method) === "password");
      if (byPassword) {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.search = `?error=${encodeURIComponent(
          "Este acesso só abre pelo link enviado por e-mail. Peça um novo à equipe TAKT.",
        )}`;
        const response = NextResponse.redirect(url);
        supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
        return response;
      }
    }

    // A login gets in only once the owner has placed it: on the team, or bound
    // to a client the agency registered. Anything else — a login made outside
    // the app, a profile never placed — waits on one page until a dono
    // approves it in Configurações. A failed lookup waits too: closed, not open.
    const approved =
      profile?.role === "dono" ||
      profile?.role === "operador" ||
      (profile?.role === "cliente" && !!profile.client_id);

    if (!approved) {
      if (pathname.startsWith("/aguardando")) return supabaseResponse;
      const url = request.nextUrl.clone();
      url.pathname = "/aguardando";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/aguardando")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    if (isPasswordRoute) return supabaseResponse;

    // A login created by someone else starts with a password that someone else
    // knows. Until it is replaced, one page is all it reaches — done here
    // rather than per page, so a page added later is covered without anyone
    // remembering to cover it.
    if (!profile!.password_changed_at) {
      const url = request.nextUrl.clone();
      url.pathname = "/trocar-senha";
      return NextResponse.redirect(url);
    }

    // A client belongs on its own pages. The database already refuses it
    // everything else, so this is not what keeps the data safe — it is what
    // keeps the client from landing on the agency's dashboard and finding it
    // empty, or on a tab of tools that will not work for them.
    // The Clientes list is allowed too: the database hands a client only its
    // own row, so the list holds that one folder.
    if (profile?.role === "cliente" && profile.client_id) {
      const own = `/clientes/${profile.client_id}`;
      if (
        pathname !== "/clientes" &&
        !pathname.startsWith("/boas-vindas") &&
        !pathname.startsWith(own)
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/clientes";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
