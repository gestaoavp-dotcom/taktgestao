// Where Mercado Livre sends the client back, carrying the authorisation code.
//
// This is the URI registered in the application at developers.mercadolivre.com.br
// and it has to match character for character — https, no trailing slash.

import type { NextRequest } from "next/server";
import { finishConnection, MeliConnectionError } from "@/lib/meli/connections";
import { MeliOAuthError } from "@/lib/meli/oauth";
import { resultPage } from "@/lib/meli/result-page";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code || !state) {
    return resultPage({
      ok: false,
      title: "Autorização não concluída",
      message:
        "A autorização foi cancelada ou não voltou com os dados esperados. " +
        "Abra o link de novo para tentar outra vez.",
    });
  }

  try {
    const connection = await finishConnection(state, code);
    return resultPage({
      ok: true,
      title: "Conta conectada!",
      message:
        "A conta {} foi conectada com sucesso. Pode fechar esta página — " +
        "daqui para frente os dados de venda chegam sozinhos.",
      highlight: connection.nickname ?? undefined,
    });
  } catch (caught) {
    // The message is safe to show for both of ours: one is written for the
    // client, the other says what Mercado Livre refused. Anything else is a
    // bug of ours and goes to the log, not to the client's screen.
    const known = caught instanceof MeliConnectionError || caught instanceof MeliOAuthError;
    if (!known) console.error("[meli/callback]", caught);

    return resultPage({
      ok: false,
      title: "Não foi possível conectar",
      message: known
        ? (caught as Error).message
        : "Deu erro ao concluir a conexão com o Mercado Livre. Tente abrir o link de novo.",
    });
  }
}
