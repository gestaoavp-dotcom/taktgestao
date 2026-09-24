import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
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

  // A login created by someone else starts with a password that someone else
  // knows. Until it is replaced, this page is the only one it reaches — done
  // here rather than per page, so a page added later is covered without anyone
  // remembering to cover it.
  if (user && !isPasswordRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("password_changed_at")
      .eq("id", user.id)
      .maybeSingle<{ password_changed_at: string | null }>();

    if (profile && !profile.password_changed_at) {
      const url = request.nextUrl.clone();
      url.pathname = "/trocar-senha";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
