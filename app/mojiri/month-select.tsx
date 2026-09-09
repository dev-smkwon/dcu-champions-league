"use client";

import { useRouter } from "next/navigation";

export function MojiriMonthSelect({ value, months, scope }: { value: string; months: string[]; scope: string }) {
  const router = useRouter();
  return <label className="mojiri-month-select"><span>대회 기록</span><select value={value} onChange={(event) => router.push(`/mojiri?month=${event.target.value}&scope=${scope}`)}>{months.map(month => <option key={month} value={month}>{month.slice(0,4)}년 {Number(month.slice(5))}월</option>)}</select></label>;
}
