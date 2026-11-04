"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { BarChart3, Boxes, Calculator, Database, FlaskConical, ReceiptText, UserCheck, WalletCards } from "lucide-react";
import { Suspense } from "react";
import { useCafeData } from "./DataProvider";
import { LoginScreen, PasswordRecoveryScreen } from "./LoginScreen";
import { AccessRequestGate } from "./AccessRequestGate";
import { SalesWorkspaceNav } from "./SalesWorkspaceNav";

const groups = [
  { label: "", links: [["/", "대시보드", BarChart3]] },
  { label: "판매 · 손익", links: [["/sales", "판매 관리", ReceiptText]] },
  { label: "재고 · 구매", links: [["/inventory", "재고 관리", Boxes], ["/inventory/batches", "제조 배치", FlaskConical], ["/costs", "구매·원가", Calculator]] },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname=usePathname(); const {summary,supported,cloud,userEmail,access,authError,passwordRecovery,loading,reloadAuth,finishPasswordRecovery,signOut}=useCafeData();
  const sample=summary?.dataClass.trim()==="가상 매장 샘플";
  const dataLabel=sample?"샘플 데이터":summary?.dataClass.trim()==="실제 매장"?"운영 데이터":summary?"자료 유형 미확인":"자료 상태 미확인";
  const activeLink = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/sales") return pathname === "/sales" || pathname.startsWith("/sales/") || pathname === "/profitability" || pathname.startsWith("/profitability/");
    if (href === "/inventory") return pathname === "/inventory" || pathname === "/inventory/" || pathname.startsWith("/inventory/items") || pathname.startsWith("/inventory/history") || pathname.startsWith("/inventory/new");
    return pathname === href || pathname.startsWith(`${href}/`);
  };
  if(passwordRecovery)return <PasswordRecoveryScreen onComplete={finishPasswordRecovery}/>;
  if(loading)return <main className="login-page"><section className="login-card"><p>운영 자료를 불러오고 있습니다…</p></section></main>;
  if(cloud&&!userEmail)return <LoginScreen onSignedIn={reloadAuth}/>;
  if(cloud&&authError)return <AccessRequestGate authError={authError} onRetry={reloadAuth} onSignOut={signOut}/>;
  return <div className="app-shell"><aside className="sidebar"><Link className="brand" href="/" aria-label="POCO 운영관리"><Image src="/poco-logo.svg" width={132} height={40} alt="POCO" priority/><span>LOCAL DRINK HOUSE<small>OPERATIONS</small></span></Link><nav aria-label="주요 메뉴">{groups.map((group)=><div className="nav-group" key={group.label||"home"}>{group.label&&<span className="nav-label">{group.label}</span>}{group.links.map(([href,label,Icon])=><Link key={href} href={href} className={activeLink(href)?"active":""}><Icon size={18}/><span>{label}</span></Link>)}</div>)}<div className="nav-group"><span className="nav-label">관리자</span>{access?.role==="owner"&&<><Link href="/expenses" className={pathname.startsWith("/expenses")?"active":""}><WalletCards size={18}/><span>운영 비용</span></Link><Link href="/admin/access" className={pathname.startsWith("/admin/access")?"active":""}><UserCheck size={18}/><span>가입 요청</span></Link></>}<Link href="/data" className={activeLink("/data")?"active":""}><Database size={18}/><span>데이터 관리</span></Link></div></nav><div className="side-status"><span className={supported?"dot ok":"dot bad"}/>{cloud?"공용 자료 자동 저장":supported?"이 기기에 자동 저장":"저장 기능 사용 불가"}<small>{summary?`${dataLabel} · ${summary.totalRecords.toLocaleString()}건`:"저장된 자료 없음"}</small></div></aside><div className="workspace"><header className="topbar"><div><strong>POCO 오퍼레이션</strong><span>{sample?<><b className="badge pending">샘플 데이터</b>{" "}연습용 자료입니다.</>:dataLabel}</span></div><div className="top-actions"><Link className="button secondary compact" href="/sales/new">판매 입력</Link><Link className="button secondary compact" href="/inventory/new">재고 기록</Link>{cloud&&<button className="button secondary compact" onClick={()=>void signOut()}>로그아웃</button>}</div></header><main><Suspense fallback={null}><SalesWorkspaceNav/></Suspense>{children}</main></div></div>;
}
