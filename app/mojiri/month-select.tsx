"use client";

import { useRouter } from "next/navigation";

export function MojiriMonthSelect({ value }: { value: string }) {
  const router = useRouter();
  return <label className="mojiri-month-select"><span>대회 기록</span><select value={value} onChange={(event) => router.push(`/mojiri?month=${event.target.value}`)}><option value="2026-08">2026년 8월</option><option value="2026-07">2026년 7월</option></select></label>;
}
