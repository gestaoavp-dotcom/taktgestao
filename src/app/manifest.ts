import type { MetadataRoute } from "next";

/**
 * What makes "adicionar à tela de início" give an app rather than a bookmark:
 * standalone opens it without the browser's own bars, and the colours stop
 * the system chrome from showing white above a dark page.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TAKT Assessoria",
    short_name: "TAKT",
    description: "Vendas, custos e resultado das suas lojas nos marketplaces.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#060a18",
    theme_color: "#060a18",
    lang: "pt-BR",
    icons: [
      { src: "/icon.png", sizes: "any", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
