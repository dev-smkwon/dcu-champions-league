import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
