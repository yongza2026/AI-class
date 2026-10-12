# Espresso Ledger

카페의 판매·비용·재고 기록으로 메뉴 수익성, 기간 손익, 예상 손익과 재료 잔량을 확인하는 단일 매장용 웹 프로그램입니다.

## 실행

```bash
npm ci
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 처음에는 데이터 관리 화면에서 가상 샘플을 불러오거나 전체 엑셀 자료를 가져옵니다.

## 검사

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`npm run test:e2e`는 로컬 Chrome을 사용하며 개발 서버가 없으면 3000번 포트에서 자동 실행합니다.

## 저장과 개인정보 보호

운영자료는 서버가 아니라 사용 중인 브라우저의 IndexedDB에만 저장됩니다. 브라우저 자료 삭제나 기기 고장에 대비해 데이터 관리 화면에서 JSON 전체 백업을 정기적으로 내려받으세요. 백업 파일은 암호화되지 않으므로 공개 저장소에 올리지 마세요.

## 배포

`npm run build`는 `out` 폴더에 정적 사이트를 만듭니다. GitHub 저장소를 Vercel에 연결하면 `main`의 검사 통과 후 배포할 수 있습니다. Preview와 Production은 브라우저 저장소를 공유하지 않습니다.
