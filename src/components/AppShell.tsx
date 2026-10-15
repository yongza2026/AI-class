"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { BarChart3, Boxes, Calculator, Coffee, Database, FlaskConical, PackagePlus, ReceiptText, UserCheck, WalletCards } from "lucide-react";
import { useCafeData } from "./DataProvider";
import { LoginScreen } from "./LoginScreen";
import { AccessRequestGate } from "./AccessRequestGate";

const groups = [
  { label: "", links: [["/", "대시보드", BarChart3]] },
  { label: "판매 · 손익", links: [["/sales", "판매 기록", ReceiptText], ["/profitability", "메뉴 수익성", Coffee]] },
  { label: "재고 · 구매", links: [["/inventory", "재고 현황", Boxes], ["/inventory/items", "품목 관리", PackagePlus], ["/inventory/batches", "제조 배치", FlaskConical], ["/costs", "구매·원가", Calculator]] },
  { label: "운영", links: [["/expenses", "운영 비용", WalletCards], ["/data", "데이터 관리", Database]] },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname=usePathname(); const {summary,supported,cloud,userEmail,access,authError,loading,reloadAuth,signOut}=useCafeData();
  if(loading)return <main className="login-page"><section className="login-card"><p>운영 자료를 불러오고 있습니다…</p></section></main>;
  if(cloud&&!userEmail)return <LoginScreen onSignedIn={reloadAuth}/>;
  if(cloud&&authError)return <AccessRequestGate authError={authError} onRetry={reloadAuth} onSignOut={signOut}/>;
  return <div className="app-shell"><aside className="sidebar"><Link className="brand" href="/" aria-label="POCO 운영관리"><Image src="/poco-logo.svg" width={132} height={40} alt="POCO" priority/><span>LOCAL DRINK HOUSE<small>OPERATIONS</small></span></Link><nav aria-label="주요 메뉴">{groups.map((group)=><div className="nav-group" key={group.label||"home"}>{group.label&&<span className="nav-label">{group.label}</span>}{group.links.map(([href,label,Icon])=><Link key={href} href={href} className={pathname===href||href!=="/"&&pathname.startsWith(`${href}/`)?"active":""}><Icon size={18}/><span>{label}</span></Link>)}</div>)}{access?.role==="owner"&&<div className="nav-group"><span className="nav-label">관리자</span><Link href="/admin/access" className={pathname.startsWith("/admin/access")?"active":""}><UserCheck size={18}/><span>가입 요청</span></Link></div>}</nav><div className="side-status"><span className={supported?"dot ok":"dot bad"}/>{cloud?"공용 자료 자동 저장":supported?"이 기기에 자동 저장":"저장 기능 사용 불가"}<small>{summary?`${summary.storeName} · ${summary.totalRecords.toLocaleString()}건`:"저장된 자료 없음"}</small></div></aside><div className="workspace"><header className="topbar"><div><strong>{summary?.storeName??access?.storeName??"POCO Operations"}</strong><span>{summary?.dataClass??"Where Flavors Connect."}</span></div><div className="top-actions"><Link className="button secondary compact" href="/sales/new">판매 입력</Link><Link className="button secondary compact" href="/inventory/new">재고 기록</Link>{cloud&&<button className="button secondary compact" onClick={()=>void signOut()}>로그아웃</button>}</div></header><main>{children}</main></div></div>;
}
