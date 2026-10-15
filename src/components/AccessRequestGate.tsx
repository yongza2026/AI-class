"use client";

import { useEffect, useState } from "react";
import { Clock3, Send, ShieldX } from "lucide-react";
import { getMyAccessRequest, requestStoreAccess, type AccessRequest } from "@/lib/supabase/client";

export function AccessRequestGate({ authError, onRetry, onSignOut }: { authError: string; onRetry: () => Promise<void>; onSignOut: () => Promise<void> }) {
  const [request, setRequest] = useState<AccessRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getMyAccessRequest()
      .then((value) => { if (active) setRequest(value); })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "가입 요청을 확인하지 못했습니다."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submitRequest() {
    setBusy(true); setMessage("");
    try { const value = await requestStoreAccess(); setRequest(value); setMessage("관리자에게 가입 요청을 보냈습니다."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "가입 요청을 보내지 못했습니다."); }
    finally { setBusy(false); }
  }

  const pending = request?.status === "pending";
  const rejected = request?.status === "rejected";
  return <main className="login-page"><section className="login-card">
    {pending ? <Clock3 size={32}/> : <ShieldX size={32}/>}<h1>{pending ? "관리자 승인을 기다리고 있습니다" : rejected ? "가입 요청이 승인되지 않았습니다" : "매장 접근 권한이 없습니다"}</h1>
    <p>{pending ? "관리자가 요청을 승인하면 POCO 운영자료에 접속할 수 있습니다." : rejected ? "POCO 관리자에게 다시 문의해 주세요." : "POCO 운영자료를 사용하려면 관리자 승인이 필요합니다."}</p>
    {!pending && !rejected && <p className="auth-detail">{authError}</p>}
    {message && <div className={`notice ${message.includes("보냈습니다") ? "success" : "error"}`} role="status"><span>{message}</span></div>}
    {!loading && !request && <button className="button primary" disabled={busy} onClick={()=>void submitRequest()}><Send size={17}/>{busy ? "요청 중…" : "관리자에게 가입 요청"}</button>}
    {pending && <button className="button primary" onClick={()=>void onRetry()}>승인 여부 다시 확인</button>}
    <button className="button secondary" onClick={()=>void onSignOut()}>다른 계정으로 로그인</button>
  </section></main>;
}
