import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Link previews (WhatsApp, Instagram) need the share image as a full URL.
  metadataBase: new URL("https://taktgestao.vercel.app"),
  title: "TAKT Assessoria",
  description: "Gestão de tarefas, finanças e clientes para assessoria de marketplaces.",
  openGraph: {
    title: "TAKT Assessoria",
    description: "Assessoria para vender mais nos marketplaces.",
    siteName: "TAKT Assessoria",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${nunitoSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
