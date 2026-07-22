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
import "./pitch-theme.css";
import "./match-detail.css";
import "./match-results.css";
import "./typography-scale.css";
import "./home-refinements.css";
import "./sortable-tables.css";
import "./records.css";
import "./monthly.css";

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
  return (
    <html lang="ko">
      <body>
        {children}
        <footer className="site-footer"><div className="site-footer-brand"><span>D</span><strong>DCU CHAMPIONS LEAGUE<small>친구들과 만드는 우리만의 리그</small></strong></div><div className="api-credit"><i /> <span><b>Data based on NEXON Open API</b><small>경기 데이터는 NEXON Open API를 통해 제공됩니다.</small></span></div><em>2026 SUMMER</em></footer>
      </body>
    </html>
  );
}
