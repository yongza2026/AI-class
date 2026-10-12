import Link from "next/link";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">EPIC 2에서 구현</p><h1>{title}</h1><p>{description}</p></div></div><div className="empty-card"><span className="badge pending">다음 개발 단계</span><h2>데이터 기반이 먼저 준비되었습니다</h2><p>이번 작업은 EPIC 1만 범위에 포함됩니다. 이 화면의 입력·계산 기능은 다음 EPIC에서 실제 동작하도록 구현합니다.</p><Link className="button primary" href="/data">데이터 준비 상태 확인</Link></div></section>;
}
