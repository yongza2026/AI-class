"use client";

import { useState } from "react";
import Image from "next/image";
import { LogIn } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";

export function LoginScreen({ onSignedIn }: { onSignedIn: () => Promise<void> }) {
  const [email, setEmail] = useState("oran99@ecojv.com");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const supabase = getSupabase();
    const result = mode === "login" ? await supabase.auth.signInWithPassword({ email: email.trim(), password }) : await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (result.error) { setMessage(result.error.message); return; }
    if (mode === "signup" && !result.data.session) { setMessage("가입 확인 메일을 보냈습니다. 메일의 확인 링크를 누른 뒤 로그인해 주세요."); setMode("login"); return; }
    await onSignedIn();
  }

  return <main className="login-page"><section className="login-card">
    <Image src="/poco-logo.svg" width={180} height={54} alt="POCO" priority/>
    <p className="eyebrow">POCO OPERATIONS</p><h1>{mode === "login" ? "매장 운영자료 로그인" : "관리자 계정 만들기"}</h1>
    <p>승인된 계정만 판매·원가·재고·비용 자료를 함께 사용할 수 있습니다.</p>
    {message && <div className="notice info" role="status"><span>{message}</span></div>}
    <form onSubmit={submit} className="login-form">
      <label>이메일<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)}/></label>
      <label>비밀번호<input type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)}/></label>
      <button className="button primary" disabled={busy}><LogIn size={17}/>{busy ? "확인 중…" : mode === "login" ? "로그인" : "계정 만들기"}</button>
    </form>
    <button className="text-button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "처음 사용하는 관리자 계정 만들기" : "이미 계정이 있으면 로그인"}</button>
  </section></main>;
}
