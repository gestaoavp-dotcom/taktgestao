import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { InlineScript } from "@/components/inline-script";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

/** The bar above the page follows the theme, so it is not white over navy. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#edf0f6" },
    { media: "(prefers-color-scheme: dark)", color: "#060a18" },
  ],
};

export const metadata: Metadata = {
  // Link previews (WhatsApp, Instagram) need the share image as a full URL.
  metadataBase: new URL(SITE_URL),
  title: "TAKT Assessoria",
  description: "Gestão de tarefas, finanças e clientes para assessoria de marketplaces.",
  appleWebApp: { capable: true, title: "TAKT", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "TAKT Assessoria",
    description: "Assessoria para vender mais nos marketplaces.",
    siteName: "TAKT Assessoria",
    locale: "pt_BR",
    type: "website",
  },
};

/**
 * Settles the theme before the first paint.
 *
 * The attribute has to be on <html> by the time the browser draws, or a dark
 * user watches a white page flash first. Nothing here can wait for React, so
 * it is a blocking script — small enough to cost nothing, and it fails into
 * the light theme if storage is unavailable.
 */
const THEME_SCRIPT = `(function(){try{
var t=localStorage.getItem("takt-tema");
if(t!=="dark"&&t!=="light"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}
document.documentElement.setAttribute("data-theme",t);
if(sessionStorage.getItem("takt-borrar")==="on"){document.documentElement.setAttribute("data-privacy","on")}
}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      data-theme="light"
      className={`${jakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
