export function LoadingState({ label = "리그 데이터를 불러오는 중" }: { label?: string }) {
  return <div className="loading-state"><i /><p>{label}</p><small>NEXON Open API</small></div>;
}
