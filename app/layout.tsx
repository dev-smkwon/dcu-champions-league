import type { Metadata } from "next";
import "@fontsource-variable/noto-sans-kr";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";
import "./fonts.css";
import "./navigation.css";
import "./product.css";
import "./features.css";
import "./best-enhancements.css";
import "./loading.css";
import "./readability.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "DCU Champions League",
  description: "대구가톨릭대 친구들의 FC Online 리그 순위와 플레이 패턴",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "DCU Champions League",
    description: "우리의 경기, 하나의 리그. 2026 Summer Season",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "DCU Champions League" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DCU Champions League",
    description: "대구가톨릭대 친구들의 FC Online 리그",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
