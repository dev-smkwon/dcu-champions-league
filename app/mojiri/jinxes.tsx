import { buildJinxes, type Cup } from "./jinx-data";

export function MojiriJinxes({ tournaments }: { tournaments: Cup[] }) {
  const cups = tournaments.filter(t => t.status === "completed");
  if (cups.length < 2) return null;
  const cards = buildJinxes(cups);
  return <section className="mojiri-jinxes" aria-labelledby="jinxes-title"><header><span>JINX WATCH</span><h3 id="jinxes-title">우연인가, 모지리의 법칙인가</h3><p>완료된 {cups.length}개 대회에서 찾은 재미로 보는 패턴 · 미래 결과를 예측하는 통계는 아닙니다.</p></header><div className="jinx-grid">{cards.map(c => <article className={c.event?"is-event":undefined} key={c.title+c.copy}><span>{c.event?'특별 사건':c.hits === c.count ? '현재까지 계속' : '예외 발생'}</span><h4>{c.title}</h4><p>{c.copy}</p><strong>{c.hits}<small> / {c.count}{c.event?'건':'회'}</small></strong><div className="jinx-evidence">{c.evidence || '해당 사례 없음'}</div></article>)}</div><p className="jinx-note">비율은 조건을 확인할 수 있는 대회 또는 시리즈 기준입니다. 부전패는 실제 시리즈 승률에서 제외합니다. 표본이 4개 대회뿐이라 징크스는 재미용이며, 새로운 결과가 생기면 예외와 분모도 자동으로 함께 늘어납니다.</p></section>;
}
