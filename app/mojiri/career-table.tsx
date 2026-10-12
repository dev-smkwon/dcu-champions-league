"use client";

import { useMemo, useState } from "react";
import type { MojiriCareer } from "./jinx-data";

type SortKey = keyof Pick<MojiriCareer,"name"|"cups"|"finals"|"mojiri"|"mojiriRate"|"finalEscapeRate"|"seriesEscapeRate"|"sweepLosses"|"decidingSeries"|"biggestDefeat"|"maxFinalStreak">;
const columns: { key:SortKey; label:string; hint:string }[] = [
  {key:"name",label:"유저",hint:"이름"},{key:"cups",label:"참가",hint:"대회 참가"},{key:"finals",label:"결승",hint:"결승 진출"},{key:"mojiri",label:"모지리",hint:"이달의 모지리"},
  {key:"mojiriRate",label:"모지리율",hint:"모지리/참가"},{key:"finalEscapeRate",label:"결승 생존",hint:"결승에서 모지리를 피한 비율"},{key:"seriesEscapeRate",label:"탈출률",hint:"시리즈 승리율"},{key:"sweepLosses",label:"셧아웃",hint:"0:2·0:3 패배"},
  {key:"decidingSeries",label:"끝장전",hint:"마지막 경기까지 간 시리즈"},{key:"biggestDefeat",label:"최대 대패",hint:"한 경기 최대 패배 골 차"},{key:"maxFinalStreak",label:"연속 결승",hint:"최장 연속 결승"},
];

export function MojiriCareerTable({ rows }: { rows:MojiriCareer[] }) {
  const [sort,setSort]=useState<{key:SortKey;direction:"asc"|"desc"|null}>({key:"mojiri",direction:"desc"});
  const sorted=useMemo(()=>{
    if(!sort.direction)return rows;
    return [...rows].sort((a,b)=>{
      const av=a[sort.key],bv=b[sort.key];
      const compared=typeof av==="string" ? av.localeCompare(String(bv),"ko") : Number(av)-Number(bv);
      return sort.direction==="asc" ? compared : -compared;
    });
  },[rows,sort]);
  const toggle=(key:SortKey)=>setSort(current=>current.key!==key?{key,direction:"desc"}:current.direction==="desc"?{key,direction:"asc"}:current.direction==="asc"?{key,direction:null}:{key,direction:"desc"});
  return <section className="mojiri-career"><header><div><span>CAREER OF SHAME</span><h3>모지리 커리어</h3></div><p>헤더 클릭: 내림차순 → 오름차순 → 원래 순서</p></header><div className="career-table-wrap"><table><thead><tr>{columns.map(column=><th key={column.key}><button title={column.hint} onClick={()=>toggle(column.key)}>{column.label}<i>{sort.key===column.key?(sort.direction==="desc"?"↓":sort.direction==="asc"?"↑":"↕"):"↕"}</i></button></th>)}<th>천적</th><th>스트릭</th></tr></thead><tbody>{sorted.map(row=><tr key={row.name}><th>{row.name}</th><td>{row.cups}</td><td>{row.finals}</td><td className="career-bad">{row.mojiri}</td><td>{row.mojiriRate.toFixed(0)}%</td><td>{row.finals?`${row.finalEscapeRate.toFixed(0)}%`:"—"}</td><td>{row.seriesEscapeRate.toFixed(0)}%</td><td>{row.sweepLosses}</td><td>{row.decidingSeries}</td><td>{row.biggestDefeat}골</td><td>{row.maxFinalStreak}</td><td>{row.nemesis}<small>{row.nemesisLosses}시리즈 패</small></td><td><span>결승 {row.maxFinalStreak}</span><span>조기탈출 {row.maxEarlyEscapeStreak}</span><span>모지리 {row.maxMojiriStreak}</span></td></tr>)}</tbody></table></div><footer>탈출률은 실제 경기가 있는 시리즈의 승리 비율입니다. 부전패는 제외하며, 천적은 토너먼트 시리즈 패배 횟수 기준입니다.</footer></section>;
}
