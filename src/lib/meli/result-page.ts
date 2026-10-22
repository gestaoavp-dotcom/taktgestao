// What the client sees at the end of the Mercado Livre handshake.
//
// A plain HTML string rather than a Next page, because both ends of this flow
// are route handlers: the client arrives from Mercado Livre's redirect with no
// session of ours, and sending them through a page would mean a second hop for
// one sentence.
//
// Everything is escaped here, inside, and the function takes text — never
// markup. The version this was ported from took HTML and trusted each caller
// to escape first; all three did, but the next one only had to forget once.

import "server-only";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

export function resultPage({
  title,
  message,
  highlight,
  ok,
}: {
  title: string;
  message: string;
  /** A name to set in bold inside the message, in place of {}. */
  highlight?: string;
  ok: boolean;
}): Response {
  const colour = ok ? "#15803d" : "#c0362c";
  const body = escapeHtml(message).replace(
    "{}",
    highlight ? `<b>${escapeHtml(highlight)}</b>` : "",
  );

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #060a18; color: #f3f6ff;
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px;
  }
  .card {
    background: #0b1229; border: 1px solid rgba(255,255,255,.08);
    max-width: 440px; width: 100%; padding: 32px; border-radius: 18px; text-align: center;
  }
  h1 { font-size: 20px; color: ${colour}; margin: 0 0 12px; }
  p { line-height: 1.55; margin: 0; color: #a3aecf; }
  .mark { font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: #f5b82e; margin: 0 0 18px; }
</style>
</head>
<body>
  <div class="card">
    <p class="mark">TAKT</p>
    <h1>${escapeHtml(title)}</h1>
    <p>${body}</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: ok ? 200 : 400,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Nothing here is worth keeping, and the URL carried a one-time code.
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    },
  });
}
