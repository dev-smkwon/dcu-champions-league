import { buildJinxes, type Cup } from "./jinx-data";

export function MojiriJinxes({ tournaments }: { tournaments: Cup[] }) {
  const cups = tournaments.filter(t => t.status === "completed");
  if (cups.length < 2) return null;
  const cards = buildJinxes(cups);
  return <section className="mojiri-jinxes" aria-labelledby="jinxes-title"><header><span>JINX WATCH</span><h3 id="jinxes-title">우연인가, 모지리의 법칙인가</h3><p>완료된 {cups.length}개 대회에서 찾은 재미로 보는 패턴 · 미래 결과를 예측하는 통계는 아닙니다.</p></header><div className="jinx-grid">{cards.map(c => <article key={c.title+c.copy}><span>{c.hits === c.count ? '현재까지 계속' : '예외 발생'}</span><h4>{c.title}</h4><p>{c.copy}</p><strong>{c.hits}<small> / {c.count}회</small></strong><div className="jinx-evidence">{c.evidence || '해당 사례 없음'}</div></article>)}</div><p className="jinx-note">각 비율은 조건을 확인할 수 있는 대회 기준이며, 반반 공식은 그냥강혜중의 참가 대회 기준입니다. 아래 날짜는 패턴에 해당한 대회입니다. 부전패는 필요한 패배 횟수가 적어 모지리에 도달하기 쉬운 구조이며, 적은 표본에서 발견한 패턴은 우연일 수 있습니다.</p></section>;
}
