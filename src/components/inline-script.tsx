/**
 * A script the browser runs while it parses the HTML, before the first paint.
 *
 * React warns when a render produces a <script>, because one inserted through
 * a DOM update never executes. The type flips to text/plain on the client so
 * the tag React re-renders is inert, which is the shape Next's own guide on
 * preventing flash before hydration prescribes.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
