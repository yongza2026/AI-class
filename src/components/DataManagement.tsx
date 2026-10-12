"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Download, FileJson, FileSpreadsheet, Upload } from "lucide-react";
import { useCafeData } from "./DataProvider";
import { createBackup, parseBackup } from "@/lib/data/backup";
import { readDataset, replaceDataset } from "@/lib/data/database";
import { downloadBlob, downloadExcelTemplate, parseExcel } from "@/lib/data/excel";
import { normalizeExternalJson } from "@/lib/data/normalize";
import { validateDataset } from "@/lib/data/schema";
import type { CafeDataset, ImportIssue } from "@/lib/data/types";

type Pending = { kind: "엑셀 가져오기" | "JSON 복원"; data: CafeDataset; ignored?: string[] };

export function DataManagement() {
  const { summary, supported, refresh } = useCafeData();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const excelRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  async function loadSample() {
    if (summary) {
      if (!confirm("현재 자료 전체가 샘플로 교체됩니다. 계속할까요?")) return;
      if (!confirm("기존 자료는 되돌릴 수 없습니다. 백업했는지 확인하고 정말 교체할까요?")) return;
    }
    await run(async () => {
      const response = await fetch("/sample/prep-cafe-v3.1.json");
      if (!response.ok) throw new Error("샘플 파일을 읽지 못했습니다.");
      const checked = validateDataset(normalizeExternalJson(await response.json()));
      if (!checked.data) { setIssues(checked.issues); throw new Error("샘플 자료 검사에 실패했습니다."); }
      await replaceDataset(checked.data); await refresh();
      setMessage({ kind: "success", text: "프렙 카페 가상 샘플을 저장했습니다. 실제 매장 자료가 아닙니다." });
    });
  }

  async function onExcel(file?: File) {
    if (!file) return;
    setBusy(true); setIssues([]); setPending(null); setMessage({ kind: "info", text: "엑셀 전체 자료를 검사하고 있습니다…" });
    const result = await parseExcel(file);
    setBusy(false);
    if (!result.data) { setIssues(result.issues); setMessage({ kind: "error", text: `오류 ${result.issues.length}건이 있어 기존 자료는 변경하지 않았습니다.` }); return; }
    setPending({ kind: "엑셀 가져오기", data: result.data, ignored: result.ignoredSheets });
    setMessage({ kind: "info", text: `검사를 통과했습니다. ${result.data.sales.length.toLocaleString()}건의 판매기록을 포함한 전체 자료를 확인 후 교체할 수 있습니다.` });
  }

  async function onRestore(file?: File) {
    if (!file) return;
    setBusy(true); setIssues([]); setPending(null);
    try {
      if (!file.name.toLowerCase().endsWith(".json")) throw new Error(".json 백업 파일만 선택해 주세요.");
      const parsed = JSON.parse(await file.text());
      const checked = parseBackup(parsed);
      if (!checked.data) { setIssues(checked.issues); setMessage({ kind: "error", text: "백업 파일을 복원할 수 없어 기존 자료는 변경하지 않았습니다." }); return; }
      setPending({ kind: "JSON 복원", data: checked.data });
      setMessage({ kind: "info", text: `백업 검사를 통과했습니다. 전체 ${Object.values(checked.data).filter(Array.isArray).reduce((sum, rows) => sum + rows.length, 0).toLocaleString()}건을 확인 후 복원할 수 있습니다.` });
    } catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "백업 파일을 읽지 못했습니다." }); }
    finally { setBusy(false); }
  }

  async function commitPending() {
    if (!pending || !confirm(`${pending.kind}을 실행하면 현재 자료 전체가 교체됩니다. 실행할까요?`)) return;
    await run(async () => { await replaceDataset(pending.data); await refresh(); setMessage({ kind: "success", text: `${pending.kind}을 완료했습니다. 모든 화면이 새 자료를 사용합니다.${pending.ignored?.length ? ` 무시한 추가 시트: ${pending.ignored.join(", ")}` : ""}` }); setPending(null); });
  }

  async function backup() {
    await run(async () => {
      const data = await readDataset(); if (!data) throw new Error("백업할 자료가 없습니다.");
      const envelope = createBackup(data); const now = new Date();
      const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now).replaceAll("-", "");
      const time = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(now).replace(":", "");
      downloadBlob(new Blob([JSON.stringify(envelope)], { type: "application/json" }), `카페운영_전체백업_${date}_${time}.json`);
      setMessage({ kind: "success", text: "전체 JSON 백업을 내려받았습니다. 파일은 암호화되지 않으므로 안전한 곳에 보관하세요." });
    });
  }

  async function run(action: () => Promise<void>) {
    setBusy(true); setIssues([]); setPending(null);
    try { await action(); } catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "처리 중 오류가 발생했습니다. 기존 자료는 유지됩니다." }); }
    finally { setBusy(false); }
  }

  return <section className="page"><div className="page-heading"><div><p className="eyebrow">저장 · 가져오기 · 복구</p><h1>데이터 관리</h1><p>자료는 서버로 보내지 않고 현재 브라우저에만 저장합니다.</p></div><span className={`badge ${summary ? "verified" : "pending"}`}>{summary ? "저장된 자료 있음" : "자료 준비 필요"}</span></div>
    {!supported && <div className="notice error"><AlertTriangle/><div><strong>이 브라우저에서는 저장소를 사용할 수 없습니다</strong><span>시크릿 모드를 끄거나 최신 Chrome·Edge에서 다시 열어 주세요.</span></div></div>}
    {summary && <div className="notice success"><CheckCircle2/><div><strong>{summary.storeName} · {summary.dataClass}</strong><span>기준일 {summary.asOf} · 전체 {summary.totalRecords.toLocaleString()}건 · 브라우저를 다시 열어도 유지됩니다.</span></div></div>}
    {message && <div role="status" className={`notice ${message.kind}`}><div><strong>{message.kind === "success" ? "완료" : message.kind === "error" ? "확인 필요" : "검사 결과"}</strong><span>{message.text}</span></div></div>}
    {pending && <div className="confirm-panel"><div><strong>{pending.kind} 준비 완료</strong><p>현재 자료 전체가 교체됩니다. 일부 자료만 합치지는 않습니다.</p></div><div className="actions"><button className="button secondary" onClick={() => { setPending(null); setMessage(null); }}>취소</button><button className="button danger" onClick={commitPending}>전체 교체 확인</button></div></div>}
    <div className="action-grid">
      <ActionCard icon={FileSpreadsheet} title="엑셀 양식과 가져오기" text="정해진 12개 시트의 양식을 받고, 작성한 전체 자료를 검사한 뒤 교체합니다."><button disabled={busy} className="button secondary" onClick={() => run(downloadExcelTemplate)}><Download size={16}/>엑셀 양식 다운로드</button><button disabled={busy} className="button primary" onClick={() => excelRef.current?.click()}><Upload size={16}/>엑셀 전체 가져오기</button><input ref={excelRef} hidden type="file" accept=".xlsx" onChange={(e) => { void onExcel(e.target.files?.[0]); e.currentTarget.value = ""; }}/></ActionCard>
      <ActionCard icon={FileJson} title="JSON 전체 백업과 복원" text="현재 자료 전체를 한 파일로 보관하거나, 이 프로그램의 백업 파일로 되돌립니다."><button disabled={busy || !summary} className="button secondary" onClick={backup}><Download size={16}/>전체 백업 다운로드</button><button disabled={busy} className="button primary" onClick={() => jsonRef.current?.click()}><Upload size={16}/>JSON 전체 복원</button><input ref={jsonRef} hidden type="file" accept="application/json,.json" onChange={(e) => { void onRestore(e.target.files?.[0]); e.currentTarget.value = ""; }}/></ActionCard>
      <ActionCard icon={Database} title="가상 샘플" text="프렙 카페 예시 자료로 저장·가져오기·백업 흐름을 확인합니다."><span className="badge pending">실제 매장 자료 아님</span><button disabled={busy || !supported} className="button primary" onClick={loadSample}>{summary ? "샘플로 전체 교체" : "샘플 불러오기"}</button></ActionCard>
    </div>
    {issues.length > 0 && <div className="card error-list"><h2>고쳐야 할 항목 ({issues.length}건)</h2><p>한 건이라도 오류가 있으면 기존 자료를 전혀 바꾸지 않습니다.</p><div className="table-wrap"><table><thead><tr><th>시트</th><th>행</th><th>열</th><th>입력값</th><th>이유</th></tr></thead><tbody>{issues.map((issue,index)=><tr key={index}><td>{issue.sheet}</td><td>{issue.row ?? "-"}</td><td>{issue.column ?? "-"}</td><td>{issue.value == null ? "-" : String(issue.value)}</td><td>{issue.message}</td></tr>)}</tbody></table></div></div>}
    <div className="security-note"><ShieldIcon/><div><strong>백업 안내</strong><p>브라우저 자료 삭제나 기기 고장 때는 자동 복구되지 않습니다. 작업 후 JSON 백업을 내려받으세요. 백업은 평문이므로 공개 저장소나 공유 폴더에 올리지 마세요.</p></div></div>
  </section>;
}

function ActionCard({ icon: Icon, title, text, children }: { icon: typeof FileJson; title: string; text: string; children: React.ReactNode }) { return <article className="action-card"><div className="action-icon"><Icon size={22}/></div><h2>{title}</h2><p>{text}</p><div className="actions vertical">{children}</div></article>; }
function ShieldIcon() { return <CheckCircle2 size={22}/>; }
