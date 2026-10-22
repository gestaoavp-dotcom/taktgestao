// The link the team sends a client. Opening it starts the Mercado Livre
// authorisation; the client never sees this URL again afterwards.

import { NextResponse, type NextRequest } from "next/server";
import { MeliConnectionError, startConnection } from "@/lib/meli/connections";
import { meliConfigured } from "@/lib/meli/oauth";
import { resultPage } from "@/lib/meli/result-page";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!meliConfigured()) {
    return resultPage({
      ok: false,
      title: "Conexão indisponível",
      message:
        "Este link não pode ser aberto agora porque a integração com o Mercado Livre não " +
        "está configurada neste servidor. Avise a equipe TAKT.",
    });
  }

  try {
    const url = await startConnection(token);
    // 302 and no-store: the browser must not keep a redirect that carries a
    // live PKCE challenge, and the client may well open the link twice.
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" },
    });
  } catch (error) {
    if (!(error instanceof MeliConnectionError)) {
      console.error("[meli/conectar]", error);
    }
    return resultPage({
      ok: false,
      title: "Link inválido",
      message:
        (error instanceof MeliConnectionError
          ? error.message
          : "Não foi possível iniciar a conexão.") + " Peça um link novo à equipe TAKT.",
    });
  }
}
