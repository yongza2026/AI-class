"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, UserCheck, XCircle } from "lucide-react";
import { useCafeData } from "./DataProvider";
import { listAccessRequests, reviewAccessRequest, type AccessRequest, type AccessRequestRole } from "@/lib/supabase/client";

export function AccessRequestManager() {
  const { access } = useCafeData();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [roles, setRoles] = useState<Record<string, AccessRequestRole>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { const rows = await listAccessRequests(); setRequests(rows); setRoles(Object.fromEntries(rows.map((row) => [row.id, row.assignedRole]))); }
    catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "가입 요청을 불러오지 못했습니다." }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    if (access?.role !== "owner") return;
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [access?.role, load]);
  const pendingCount = useMemo(() => requests.filter((row) => row.status === "pending").length, [requests]);

  async function review(row: AccessRequest, status: "approved" | "rejected") {
    const action = status === "approved" ? "승인" : "거절";
    if (!confirm(`${row.email} 사용자의 가입 요청을 ${action}할까요?`)) return;
    setBusyId(row.id); setMessage(null);
    try { await reviewAccessRequest(row.id, status, roles[row.id] ?? "editor"); setMessage({ kind: "success", text: `${row.email} 가입 요청을 ${action}했습니다.` }); await load(); }
    catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "가입 요청을 처리하지 못했습니다." }); }
    finally { setBusyId(""); }
  }

  if (access?.role !== "owner") return <section className="page"><div className="empty-card"><XCircle size={34}/><h2>관리자 전용 화면입니다</h2><p>POCO 관리자만 가입 요청을 확인하고 처리할 수 있습니다.</p></div></section>;
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">사용자 · 권한</p><h1>가입 요청 승인</h1><p>가입 요청을 확인하고 입력·수정 또는 조회 전용 권한을 부여합니다.</p></div><div className="actions"><span className={`badge ${pendingCount ? "pending" : "verified"}`}>대기 {pendingCount}건</span><button className="button secondary" disabled={loading} onClick={()=>void load()}><RefreshCw size={16}/>새로고침</button></div></div>
    {message && <div className={`notice ${message.kind}`} role="status"><span>{message.text}</span></div>}
    <div className="card table-card"><h2>요청 목록</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>요청 이메일</th><th>요청일</th><th>상태</th><th>승인 권한</th><th>처리</th></tr></thead><tbody>
      {requests.map((row)=><tr key={row.id}><td>{row.email}</td><td>{new Date(row.requestedAt).toLocaleString("ko-KR")}</td><td><span className={`badge ${row.status === "approved" ? "verified" : "pending"}`}>{row.status === "pending" ? "승인 대기" : row.status === "approved" ? "승인" : "거절"}</span></td><td>{row.status === "pending" ? <select className="inline-select" aria-label={`${row.email} 권한`} value={roles[row.id] ?? "editor"} onChange={(event)=>setRoles((current)=>({...current,[row.id]:event.target.value as AccessRequestRole}))}><option value="editor">입력·수정</option><option value="viewer">조회 전용</option></select> : row.assignedRole === "editor" ? "입력·수정" : "조회 전용"}</td><td>{row.status === "pending" ? <div className="actions"><button className="button primary compact" disabled={busyId===row.id} onClick={()=>void review(row,"approved")}><CheckCircle2 size={15}/>승인</button><button className="button secondary compact" disabled={busyId===row.id} onClick={()=>void review(row,"rejected")}><XCircle size={15}/>거절</button></div> : "처리 완료"}</td></tr>)}
      {!loading && requests.length===0 && <tr><td className="table-empty" colSpan={5}><UserCheck size={28}/><p>현재 가입 요청이 없습니다.</p></td></tr>}
      {loading && <tr><td className="table-empty" colSpan={5}>가입 요청을 불러오고 있습니다…</td></tr>}
    </tbody></table></div></div>
  </section>;
}
