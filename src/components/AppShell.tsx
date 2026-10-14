"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { BarChart3, Box, Calculator, Coffee, Database, ReceiptText, WalletCards } from "lucide-react";
import { useCafeData } from "./DataProvider";

const nav = [
  ["/", "대시보드", BarChart3], ["/sales", "판매 기록", ReceiptText], ["/profitability", "메뉴 수익성", Coffee],
  ["/inventory", "재고 관리", Box], ["/expenses", "비용 기록", WalletCards], ["/costs", "원가 관리", Calculator], ["/data", "데이터 관리", Database],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { summary, supported } = useCafeData();
  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="POCO 운영관리 홈"><Image src="/poco-logo.svg" width={132} height={40} alt="POCO" priority/><span>LOCAL DRINK HOUSE<small>OPERATIONS</small></span></Link>
      <nav aria-label="주요 메뉴">
        {nav.map(([href, label, Icon]) => <Link key={href} href={href} className={pathname === href ? "active" : ""}><Icon size={18}/><span>{label}</span></Link>)}
      </nav>
      <div className="side-status"><span className={supported ? "dot ok" : "dot bad"}/>{supported ? "이 기기에 자동 저장" : "저장 기능 사용 불가"}<small>{summary ? `${summary.storeName} · ${summary.totalRecords.toLocaleString()}건` : "저장된 자료 없음"}</small></div>
    </aside>
    <div className="workspace"><header className="topbar"><div><strong>{summary?.storeName ?? "POCO Operations"}</strong><span>{summary?.dataClass ?? "Where Flavors Connect."}</span></div><div className="top-actions"><Link className="button secondary compact" href="/sales/new">판매 입력</Link><Link className="button secondary compact" href="/inventory/new">재고 기록</Link><Link className="button secondary compact" href="/data">데이터 관리</Link></div></header><main>{children}</main></div>
  </div>;
}
