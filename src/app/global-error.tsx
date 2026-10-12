"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="ko"><body><main style={{ padding: 32, fontFamily: "system-ui" }}><h1>프로그램을 열지 못했습니다</h1><p>브라우저의 저장 자료는 지우지 않았습니다.</p><button onClick={reset}>다시 시도</button></main></body></html>;
}
