"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("APP_UI_ERROR", { name: error.name, digest: error.digest }); }, [error]);
  return <section className="page"><div className="empty-card"><h1>화면을 불러오지 못했습니다</h1><p>저장된 자료는 지우지 않았습니다. 다시 시도해도 문제가 계속되면 JSON 백업 후 브라우저를 다시 열어 주세요.</p><button className="button primary" onClick={reset}>다시 시도</button></div></section>;
}
