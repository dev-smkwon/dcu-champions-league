"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "홈" },
  { href: "/matches", label: "경기" },
  { href: "/players", label: "유저" },
  { href: "/analysis", label: "분석" },
  { href: "/best-eleven", label: "BEST 11" },
  { href: "/records", label: "기록실" },
];

export function FloatingNav() {
  const pathname = usePathname();
  return <nav className="island-nav" aria-label="주 메뉴">
    <Link href="/" className="island-brand"><span>D</span><b>DCU CL</b></Link>
    <div>{items.map((item) => <Link key={item.href} href={item.href} className={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) ? "active" : ""}>{item.label}</Link>)}</div>
    <span className="live-pill"><i /> LIVE</span>
  </nav>;
}
