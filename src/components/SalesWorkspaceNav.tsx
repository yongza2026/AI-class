"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSalesWorkspaceFilters } from "./useSalesWorkspaceFilters";

const tabs = [
  { href: "/sales", label: "판매 기록" },
  { href: "/profitability", label: "메뉴 수익성" },
] as const;

export function SalesWorkspaceNav() {
  const pathname = usePathname();
  const { hrefFor } = useSalesWorkspaceFilters();
  const visible = pathname === "/profitability" || pathname.startsWith("/profitability/") || pathname === "/sales" || pathname.startsWith("/sales/");
  if (!visible) return null;

  return <div className="inventory-tabs-wrap">
    <nav className="inventory-tabs" aria-label="판매 관리 화면">
      {tabs.map((tab) => {
        const active = tab.href === "/sales" ? pathname === "/sales" || pathname.startsWith("/sales/") : pathname === "/profitability" || pathname.startsWith("/profitability/");
        return <Link key={tab.href} href={hrefFor(tab.href)} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>{tab.label}</Link>;
      })}
    </nav>
  </div>;
}
