"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { KeyRound, LockKeyhole, ShieldX } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useCafeData } from "./DataProvider";

type LockStatus = { configured: boolean; lockedUntil: string | null };

export function ExpenseAccessGate({ children }: { children: ReactNode }) {
  const { cloud, access } = useCafeData();
  const storageKey = access ? `poco-expense-unlocked:${access.storeId}` : "";
  const [status, setStatus] = useState<LockStatus | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [unlocked, setUnlocked] = useState(() => typeof window !== "undefined" && Boolean(storageKey) && sessionStorage.getItem(storageKey) === "1");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    if (!cloud || access?.role !== "owner" || !storageKey) return;
    getSupabase().rpc("expense_lock_status").then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage(`운영 비용 잠금을 확인하지 못했습니다: ${error.message}`);
      else setStatus(data as LockStatus);
    });
    return () => { active = false; };
  }, [access?.role, cloud, storageKey]);

  if (!cloud) return <section className="page"><div className="empty-card"><ShieldX size={34}/><h2>공용 저장소 연결이 필요합니다</h2><p>운영 비용은 관리자 계정과 별도 비밀번호로 보호되므로 공용 저장소 연결 환경에서만 사용할 수 있습니다.</p></div></section>;
  if (access?.role !== "owner") return <section className="page"><div className="empty-card"><ShieldX size={34}/><h2>관리자 전용 화면입니다</h2><p>운영 비용은 owner 권한이 있는 관리자만 확인할 수 있습니다.</p></div></section>;
  if (unlocked) return <><div className="expense-lock-toolbar"><span><LockKeyhole size={15}/>이 브라우저 탭에서 운영 비용 잠금이 해제되었습니다.</span><button className="button secondary compact" onClick={() => { sessionStorage.removeItem(storageKey); setUnlocked(false); setPassword(""); }}>다시 잠그기</button></div>{children}</>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!status) return;
    if (password.length < 8 || password.length > 72) { setMessage("관리 비밀번호는 8자 이상 72자 이하로 입력해 주세요."); return; }
    if (!status.configured && password !== confirmation) { setMessage("새 비밀번호와 확인 값이 같지 않습니다."); return; }
    setBusy(true);
    try {
      if (status.configured) {
        const { data, error } = await getSupabase().rpc("verify_expense_lock_password", { p_password: password });
        if (error) throw error;
        if (!data) throw new Error("관리 비밀번호가 맞지 않습니다.");
      } else {
        const { error } = await getSupabase().rpc("set_expense_lock_password", { p_password: password, p_current_password: null });
        if (error) throw error;
      }
      sessionStorage.setItem(storageKey, "1");
      setUnlocked(true);
      setPassword("");
      setConfirmation("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "운영 비용 잠금을 해제하지 못했습니다.");
    } finally { setBusy(false); }
  }

  return <main className="login-page"><section className="login-card expense-lock-card"><LockKeyhole size={34}/><p className="eyebrow">OWNER ONLY</p><h1>{status?.configured ? "운영 비용 잠금 해제" : "운영 비용 비밀번호 설정"}</h1><p>{status?.configured ? "관리자 전용 비용 자료를 보려면 별도 비밀번호를 입력해 주세요." : "처음 사용할 관리 비밀번호를 설정해 주세요. 로그인 비밀번호와 다른 값을 권장합니다."}</p>{!status&&!message&&<p>보안 설정을 확인하고 있습니다…</p>}<form className="login-form" onSubmit={submit}><label>관리 비밀번호<input type="password" autoComplete={status?.configured ? "current-password" : "new-password"} minLength={8} maxLength={72} required disabled={!status||busy} value={password} onChange={(event)=>setPassword(event.target.value)}/></label>{status&&!status.configured&&<label>비밀번호 확인<input type="password" autoComplete="new-password" minLength={8} maxLength={72} required disabled={busy} value={confirmation} onChange={(event)=>setConfirmation(event.target.value)}/></label>}{message&&<div className="notice error" role="alert"><span>{message}</span></div>}<button className="button primary" disabled={!status||busy}><KeyRound size={16}/>{busy?"확인 중…":status?.configured?"잠금 해제":"비밀번호 설정"}</button></form></section></main>;
}
